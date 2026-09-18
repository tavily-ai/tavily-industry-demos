import asyncio
import logging
import os
from typing import Any, Dict, List, Union

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from ..classes import ResearchState
from ..classes.state import emit_event
from ..prompts import (
    DESTINATION_BRIEFING_PROMPT,
    TRENDS_BRIEFING_PROMPT,
    PRICING_BRIEFING_PROMPT,
    DISRUPTIONS_BRIEFING_PROMPT,
    BRIEFING_ANALYSIS_INSTRUCTION
)

logger = logging.getLogger(__name__)

class Briefing:
    """Creates briefings for each research category and updates the ResearchState."""

    def __init__(self) -> None:
        self.max_doc_length = 8000
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")

        self.llm = ChatOpenAI(
            model="gpt-5.6-luna",
            temperature=0,
            api_key=openai_key,
        )

    def _get_category_prompt(self, category: str) -> str:
        prompts = {
            'destination': DESTINATION_BRIEFING_PROMPT,
            'trends': TRENDS_BRIEFING_PROMPT,
            'pricing': PRICING_BRIEFING_PROMPT,
            'disruptions': DISRUPTIONS_BRIEFING_PROMPT,
        }
        return prompts.get(category,
                          "Create a focused travel intelligence briefing on {destination}. Travel focus: {travel_segment}. Research priorities: {research_priorities}.")

    def _prepare_documents(self, docs: Union[Dict[str, Any], List[Dict[str, Any]]]) -> str:
        items = list(docs.items()) if isinstance(docs, dict) else [
            (doc.get('url', f'doc_{i}'), doc) for i, doc in enumerate(docs)
        ]

        sorted_items = sorted(
            items,
            key=lambda x: float(x[1].get('evaluation', {}).get('overall_score', '0')),
            reverse=True
        )

        doc_texts = []
        total_length = 0
        for _, doc in sorted_items:
            title = doc.get('title', '')
            content = doc.get('raw_content') or doc.get('content', '')

            if len(content) > self.max_doc_length:
                content = content[:self.max_doc_length] + "... [content truncated]"

            doc_entry = f"Title: {title}\n\nContent: {content}"
            if total_length + len(doc_entry) < 120000:
                doc_texts.append(doc_entry)
                total_length += len(doc_entry)
            else:
                break

        separator = "\n" + "-" * 40 + "\n"
        return f"{separator}{separator.join(doc_texts)}{separator}"

    async def generate_category_briefing(
        self, docs: Union[Dict[str, Any], List[Dict[str, Any]]],
        category: str, context: Dict[str, Any]
    ):
        destination = context.get('destination', 'Unknown')
        travel_segment = context.get('travel_segment', 'not specified')
        research_priorities = context.get('research_priorities', 'not specified')
        job_id = context.get('job_id')

        logger.info(f"Generating {category} briefing for {destination} using {len(docs)} documents")

        event = {
            "type": "briefing_start",
            "category": category,
            "total_docs": len(docs),
            "step": "Briefing"
        }

        emit_event(job_id, event)
        yield event

        category_prompt = self._get_category_prompt(category).format(
            destination=destination,
            travel_segment=travel_segment,
            research_priorities=research_priorities,
        )
        formatted_docs = self._prepare_documents(docs)

        briefing_prompt = ChatPromptTemplate.from_messages([
            ("user", """{category_prompt}

{instruction}

{documents}""")
        ])

        chain = briefing_prompt | self.llm | StrOutputParser()

        try:
            logger.info("Sending prompt to LLM")
            content = await chain.ainvoke({
                "category_prompt": category_prompt,
                "instruction": BRIEFING_ANALYSIS_INSTRUCTION,
                "documents": formatted_docs
            })

            if not content:
                logger.error(f"Empty response from LLM for {category} briefing")
                yield {"type": "error", "error": "Empty response from LLM", "category": category}
                yield {'content': ''}
                return

            event = {
                "type": "briefing_complete",
                "category": category,
                "content_length": len(content),
                "step": "Briefing"
            }

            emit_event(job_id, event)
            yield event
            yield {'content': content.strip()}
        except Exception as e:
            logger.error(f"Error generating {category} briefing: {e}")
            raise RuntimeError(f"Fatal API error - {category} briefing generation failed: {str(e)}") from e

    async def create_briefings(self, state: ResearchState) -> ResearchState:
        destination = state.get('destination', 'Unknown destination')
        logger.info(f"Creating section briefings for {destination}")

        context = {
            "destination": destination,
            "travel_segment": state.get('travel_segment') or 'not specified',
            "research_priorities": state.get('research_priorities') or 'not specified',
            "job_id": state.get('job_id')
        }

        categories = {
            'destination_data': ("destination", "destination_briefing"),
            'trends_data': ("trends", "trends_briefing"),
            'pricing_data': ("pricing", "pricing_briefing"),
            'disruptions_data': ("disruptions", "disruptions_briefing")
        }

        briefings = {}

        briefing_tasks = []
        for data_field, (cat, briefing_key) in categories.items():
            curated_key = f'curated_{data_field}'
            curated_data = state.get(curated_key, {})

            if curated_data:
                logger.info(f"Processing {data_field} with {len(curated_data)} documents")
                briefing_tasks.append({
                    'category': cat,
                    'briefing_key': briefing_key,
                    'data_field': data_field,
                    'curated_data': curated_data
                })
            else:
                logger.info(f"No data available for {data_field}")
                state[briefing_key] = ""

        if briefing_tasks:
            briefing_semaphore = asyncio.Semaphore(2)

            async def process_briefing(task: Dict[str, Any]) -> Dict[str, Any]:
                async with briefing_semaphore:
                    result = {'content': ''}

                    async for event in self.generate_category_briefing(
                        task['curated_data'],
                        task['category'],
                        context
                    ):
                        if isinstance(event, dict) and 'content' in event:
                            result = event

                    if result['content']:
                        briefings[task['category']] = result['content']
                        state[task['briefing_key']] = result['content']
                        logger.info(f"Completed {task['data_field']} briefing ({len(result['content'])} characters)")
                    else:
                        raise RuntimeError(f"Empty briefing generated for {task['data_field']}")

                    return {
                        'category': task['category'],
                        'success': bool(result['content']),
                        'length': len(result['content']) if result['content'] else 0
                    }

            results = await asyncio.gather(*[
                process_briefing(task)
                for task in briefing_tasks
            ])

            successful_briefings = sum(1 for r in results if r['success'])
            total_length = sum(r['length'] for r in results)
            logger.info(f"Generated {successful_briefings}/{len(briefing_tasks)} briefings with total length {total_length}")

        state['briefings'] = briefings
        return state

    async def run(self, state: ResearchState) -> ResearchState:
        return await self.create_briefings(state)
