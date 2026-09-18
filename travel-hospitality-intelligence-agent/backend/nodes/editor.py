import logging
import os
from typing import Dict

from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from ..classes import ResearchState
from ..classes.state import emit_event
from ..utils.references import format_references_section
from ..prompts import (
    EDITOR_SYSTEM_MESSAGE,
    COMPILE_CONTENT_PROMPT,
    CONTENT_SWEEP_SYSTEM_MESSAGE,
    CONTENT_SWEEP_PROMPT
)

logger = logging.getLogger(__name__)

class Editor:
    """Compiles individual section briefings into a cohesive final report."""

    def __init__(self) -> None:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")

        self.llm = ChatOpenAI(
            model="gpt-5.6-luna",
            temperature=0,
            streaming=True,
            api_key=openai_key
        )

        self.context = {
            "destination": "Unknown destination",
            "travel_segment": "not specified",
            "research_priorities": "not specified"
        }

    async def compile_briefings(self, state: ResearchState) -> ResearchState:
        destination = state.get('destination', 'Unknown destination')
        job_id = state.get('job_id')

        self.context = {
            "destination": destination,
            "travel_segment": state.get('travel_segment') or 'not specified',
            "research_priorities": state.get('research_priorities') or 'not specified'
        }

        msg = [f"📑 Compiling final report for {destination}..."]

        emit_event(job_id, {
            "type": "report_compilation",
            "message": f"Compiling final report for {destination}"
        })

        briefing_keys = {
            'destination': 'destination_briefing',
            'trends': 'trends_briefing',
            'pricing': 'pricing_briefing',
            'disruptions': 'disruptions_briefing'
        }

        individual_briefings = {}
        for category, key in briefing_keys.items():
            if content := state.get(key):
                individual_briefings[category] = content
                msg.append(f"Found {category} briefing ({len(content)} characters)")
            else:
                msg.append(f"No {category} briefing available")
                logger.error(f"Missing state key: {key}")

        if not individual_briefings:
            msg.append("\n⚠️ No briefing sections available to compile")
            logger.error("No briefings found in state")
        else:
            try:
                compiled_report = await self.edit_report(state, individual_briefings)
                if not compiled_report or not compiled_report.strip():
                    logger.error("Compiled report is empty!")
                else:
                    logger.info(f"Successfully compiled report with {len(compiled_report)} characters")
            except Exception as e:
                logger.error(f"Error during report compilation: {e}")

        state.setdefault('messages', []).append(AIMessage(content="\n".join(msg)))
        return state

    async def edit_report(self, state: ResearchState, briefings: Dict[str, str]) -> str:
        try:
            logger.info("Starting report compilation")
            job_id = state.get('job_id')

            edited_report = await self.compile_content(state, briefings)
            if not edited_report:
                logger.error("Initial compilation failed")
                return ""

            final_report = ""
            async for event in self.content_sweep(edited_report):
                if isinstance(event, dict):
                    emit_event(job_id, event)

                if isinstance(event, str):
                    final_report = event

            final_report = final_report or edited_report or ""

            logger.info(f"Final report compiled with {len(final_report)} characters")
            if not final_report.strip():
                logger.error("Final report is empty!")
                return ""

            state['report'] = final_report
            state['status'] = "editor_complete"
            if 'editor' not in state or not isinstance(state['editor'], dict):
                state['editor'] = {}
            state['editor']['report'] = final_report

            return final_report
        except Exception as e:
            logger.error(f"Error in edit_report: {e}")
            return ""

    async def compile_content(self, state: ResearchState, briefings: Dict[str, str]) -> str:
        combined_content = "\n\n".join(content for content in briefings.values())

        references = state.get('references', [])
        reference_text = ""
        if references:
            logger.info(f"Found {len(references)} references to add during compilation")
            reference_info = state.get('reference_info', {})
            reference_titles = state.get('reference_titles', {})
            reference_text = format_references_section(references, reference_info, reference_titles)
            logger.info(f"Added {len(references)} references during compilation")

        compile_prompt = ChatPromptTemplate.from_messages([
            ("system", EDITOR_SYSTEM_MESSAGE),
            ("user", COMPILE_CONTENT_PROMPT)
        ])

        chain = compile_prompt | self.llm | StrOutputParser()

        try:
            initial_report = await chain.ainvoke({
                "destination": self.context["destination"],
                "travel_segment": self.context["travel_segment"],
                "research_priorities": self.context["research_priorities"],
                "combined_content": combined_content
            })

            if reference_text:
                initial_report = f"{initial_report}\n\n{reference_text}"

            return initial_report
        except Exception as e:
            logger.error(f"Error in initial compilation: {e}")
            return combined_content or ""

    async def content_sweep(self, content: str):
        sweep_prompt = ChatPromptTemplate.from_messages([
            ("system", CONTENT_SWEEP_SYSTEM_MESSAGE),
            ("user", CONTENT_SWEEP_PROMPT)
        ])

        chain = sweep_prompt | self.llm | StrOutputParser()

        try:
            accumulated_text = ""
            buffer = ""

            async for chunk in chain.astream({
                "destination": self.context["destination"],
                "travel_segment": self.context["travel_segment"],
                "research_priorities": self.context["research_priorities"],
                "content": content
            }):
                accumulated_text += chunk
                buffer += chunk

                if any(char in buffer for char in ['.', '!', '?', '\n']) and len(buffer) > 10:
                    yield {"type": "report_chunk", "chunk": buffer, "step": "Editor"}
                    buffer = ""

            if buffer:
                yield {"type": "report_chunk", "chunk": buffer, "step": "Editor"}

            yield accumulated_text.strip()
        except Exception as e:
            logger.error(f"Error in formatting: {e}")
            yield {"type": "error", "error": str(e), "step": "Editor"}
            yield content or ""

    async def run(self, state: ResearchState) -> ResearchState:
        state = await self.compile_briefings(state)
        if 'report' in state:
            if 'editor' not in state or not isinstance(state['editor'], dict):
                state['editor'] = {}
            state['editor']['report'] = state['report']
        return state
