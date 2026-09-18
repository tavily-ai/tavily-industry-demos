from langchain_core.messages import AIMessage

from ..classes import ResearchState


class Collector:
    """Collects and organizes all research data before curation."""

    async def collect(self, state: ResearchState) -> ResearchState:
        destination = state.get('destination', 'Unknown destination')
        msg = [f"📦 Collecting research data for {destination}:"]

        research_types = {
            'destination_data': '📍 Destination demand',
            'trends_data': '📅 Trends and events',
            'pricing_data': '💰 Pricing and demand',
            'disruptions_data': '⚠️ Disruptions and sentiment'
        }

        for data_field, label in research_types.items():
            data = state.get(data_field, {})
            if data:
                msg.append(f"• {label}: {len(data)} documents collected")
            else:
                msg.append(f"• {label}: No data found")

        state.setdefault('messages', []).append(AIMessage(content="\n".join(msg)))

        return state

    async def run(self, state: ResearchState) -> ResearchState:
        return await self.collect(state)
