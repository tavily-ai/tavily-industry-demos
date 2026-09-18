import io
import logging
import os
import re

from backend.utils.utils import generate_pdf_from_md

logger = logging.getLogger(__name__)

class PDFService:
    def __init__(self, config):
        self.output_dir = config.get("pdf_output_dir", "pdfs")
        os.makedirs(self.output_dir, exist_ok=True)

    def _sanitize_name(self, name):
        sanitized = re.sub(r'[^\w\s-]', '', name).strip().replace(' ', '_')
        return sanitized.lower()

    def _generate_pdf_filename(self, name):
        return f"{self._sanitize_name(name)}_report.pdf"

    def generate_pdf_stream(self, markdown_content, destination_name=None):
        """Generate a PDF from markdown and return it as a stream."""
        try:
            if not destination_name:
                first_line = markdown_content.split('\n')[0].strip()
                if first_line.startswith('# '):
                    destination_name = first_line[2:].strip()
                else:
                    destination_name = "Travel Intelligence"

            pdf_filename = self._generate_pdf_filename(destination_name)
            pdf_buffer = io.BytesIO()
            generate_pdf_from_md(markdown_content, pdf_buffer)
            pdf_buffer.seek(0)
            return True, (pdf_buffer, pdf_filename)

        except Exception as e:
            error_msg = f"Error generating PDF: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
