import logging
from typing import Dict
from urllib.parse import urljoin, urlparse

from langchain_core.messages import AIMessage

from ..classes import ResearchState
from ..classes.state import emit_event
from ..utils.references import process_references_from_search_results

logger = logging.getLogger(__name__)

class Curator:
    def __init__(self) -> None:
        self.relevance_threshold = 0.4
        logger.info(f"Curator initialized with relevance threshold: {self.relevance_threshold}")

    def evaluate_documents(self, docs: list, context: Dict[str, str]) -> list:
        if not docs:
            return []

        logger.info(f"Evaluating {len(docs)} documents")

        evaluated_docs = []
        try:
            for doc in docs:
                try:
                    tavily_score = float(doc.get('score', 0))

                    if tavily_score >= self.relevance_threshold:
                        logger.info(f"Document kept (score {tavily_score:.4f}) for '{doc.get('title', 'No title')}'")

                        evaluated_doc = {
                            **doc,
                            "evaluation": {
                                "overall_score": tavily_score,
                                "query": doc.get('query', '')
                            }
                        }
                        evaluated_docs.append(evaluated_doc)
                    else:
                        logger.info(f"Document below threshold with score {tavily_score:.4f} for '{doc.get('title', 'No title')}'")
                except (ValueError, TypeError) as e:
                    logger.warning(f"Error processing score for document: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error during document evaluation: {e}")
            return []

        evaluated_docs.sort(key=lambda x: float(x['evaluation']['overall_score']), reverse=True)
        logger.info(f"Returning {len(evaluated_docs)} evaluated documents")

        return evaluated_docs

    async def curate_data(self, state: ResearchState) -> ResearchState:
        destination = state.get('destination', 'Unknown destination')
        job_id = state.get('job_id')
        logger.info(f"Starting curation for destination: {destination}, job_id={job_id}")

        context = {
            "destination": destination,
            "travel_segment": state.get('travel_segment') or 'not specified',
            "research_priorities": state.get('research_priorities') or 'not specified',
        }

        msg = [f"🔍 Curating research data for {destination}"]

        data_types = {
            'destination_data': ('📍 Destination demand', 'destination'),
            'trends_data': ('📅 Trends and events', 'trends'),
            'pricing_data': ('💰 Pricing and demand', 'pricing'),
            'disruptions_data': ('⚠️ Disruptions and sentiment', 'disruptions')
        }

        for data_field, (emoji, doc_type) in data_types.items():
            data = state.get(data_field, {})
            if not data:
                continue

            unique_docs = {}
            for url, doc in data.items():
                try:
                    parsed = urlparse(url)
                    if not parsed.scheme:
                        url = urljoin('https://', url)
                    clean_url = parsed._replace(query='', fragment='').geturl()
                    if clean_url not in unique_docs:
                        doc['url'] = clean_url
                        doc['doc_type'] = doc_type
                        unique_docs[clean_url] = doc
                except Exception:
                    continue

            docs = list(unique_docs.values())
            msg.append(f"\n{emoji}: Found {len(docs)} documents")

            evaluated_docs = self.evaluate_documents(docs, context)

            emit_event(job_id, {
                "type": "curation",
                "category": doc_type,
                "total": len(evaluated_docs) if evaluated_docs else 0,
                "message": f"Curating {doc_type} documents"
            })

            if not evaluated_docs:
                msg.append("  ⚠️ No relevant documents found")
                continue

            relevant_docs = {doc['url']: doc for doc in evaluated_docs}
            sorted_items = sorted(relevant_docs.items(), key=lambda item: item[1]['evaluation']['overall_score'], reverse=True)

            if len(sorted_items) > 5:
                sorted_items = sorted_items[:5]
            relevant_docs = dict(sorted_items)

            if relevant_docs:
                msg.append(f"  ✓ Kept {len(relevant_docs)} relevant documents")
                logger.info(f"Kept {len(relevant_docs)} documents for {doc_type} with scores above threshold")
            else:
                msg.append("  ⚠️ No documents met relevance threshold")
                logger.info(f"No documents met relevance threshold for {doc_type}")

            state[f'curated_{data_field}'] = relevant_docs

        top_reference_urls, reference_titles, reference_info = process_references_from_search_results(state)
        logger.info(f"Selected top {len(top_reference_urls)} references for the report")

        state.setdefault('messages', []).append(AIMessage(content="\n".join(msg)))
        state['references'] = top_reference_urls
        state['reference_titles'] = reference_titles
        state['reference_info'] = reference_info

        return state

    async def run(self, state: ResearchState) -> ResearchState:
        return await self.curate_data(state)
