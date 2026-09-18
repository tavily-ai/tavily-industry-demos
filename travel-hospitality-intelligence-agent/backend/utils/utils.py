import logging
import os
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

from .references import extract_link_info

logger = logging.getLogger(__name__)

def clean_text(text: str) -> str:
    """Clean up text by replacing escaped quotes and other special characters."""
    text = re.sub(r'",?\s*"pdf_url":.+$', '', text)
    text = text.replace('\\"', '"')
    text = text.replace('\\n', '\n')
    text = text.replace('<para>', '').replace('</para>', '')
    return text.strip()

def generate_pdf_from_md(markdown_content: str, output_pdf) -> None:
    """Convert markdown content to PDF.

    Args:
        markdown_content (str): The markdown content to convert to PDF
        output_pdf: Either a file path string or a BytesIO object
    """
    try:
        # If output_pdf is a string (file path), ensure directory exists
        if isinstance(output_pdf, str):
            os.makedirs(os.path.dirname(os.path.abspath(output_pdf)), exist_ok=True)
            
        markdown_content = markdown_content.replace('\r\n', '\n')  # Normalize Windows line endings
        markdown_content = markdown_content.replace('\\n', '\n')   # Convert literal \n to newlines
        
        # Create the PDF document
        doc = SimpleDocTemplate(
            output_pdf,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        
        # Setup styles
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.black,
            spaceAfter=12
        )
        
        heading2_style = ParagraphStyle(
            'Heading2',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.black,
            spaceBefore=12,
            spaceAfter=6,
            fontName='Helvetica-Bold'
        )
        
        heading3_style = ParagraphStyle(
            'Heading3',
            parent=styles['Heading3'],
            fontSize=12,
            textColor=colors.black,
            spaceBefore=10,
            spaceAfter=4
        )
        
        normal_style = ParagraphStyle(
            'Normal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            spaceBefore=2,
            spaceAfter=2
        )
        
        list_item_style = ParagraphStyle(
            'ListItem',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            spaceBefore=2,
            spaceAfter=2,
            leftIndent=10,
            firstLineIndent=0,
            bulletIndent=0
        )
        
        # Create the story (content)
        story = []
        
        # Process markdown content into PDF elements
        lines = markdown_content.split('\n')
        i = 0
        
        # Track if we're in a list
        in_list = False
        list_items = []
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip empty lines
            if not line:
                if in_list and list_items:
                    # Flush list if we were building one
                    story.append(ListFlowable(
                        [ListItem(Paragraph(item, list_item_style)) for item in list_items],
                        bulletType='bullet',
                        leftIndent=10,
                        bulletFontName='Helvetica',
                        bulletFontSize=10,
                        bulletOffsetY=0,
                        bulletDedent=10,
                        spaceAfter=0
                    ))
                    list_items = []
                    in_list = False
                
                story.append(Spacer(1, 6))
                i += 1
                continue
            
            # Headings
            if line.startswith('# '):
                story.append(Paragraph(line[2:], title_style))
            elif line.startswith('## '):
                story.append(Paragraph(line[3:], heading2_style))
            elif line.startswith('### '):
                story.append(Paragraph(line[4:], heading3_style))
            
            # Bullet points
            elif line.startswith('* '):
                bullet_text = line[2:].strip()  # Remove the '* ' but keep any other asterisks
                
                # For links in bullet points
                if bullet_text.startswith('[') and '](' in bullet_text and bullet_text.endswith(')'):
                    link_text, link_url = extract_link_info(bullet_text)
                    # Simplified link format to avoid potential formatting issues
                    bullet_text = f'<link href="{link_url}" color="blue"><u>{link_text or link_url}</u></link>'
                
                list_items.append(bullet_text)
                in_list = True
            
            # Regular paragraphs (including links)
            else:
                # Handle bold and italic text
                line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)  # Bold
                line = re.sub(r'\*(.*?)\*', r'<i>\1</i>', line)      # Italic
                
                # Check for links in the text
                if '[' in line and '](' in line:
                    try:
                        # Process links
                        parts = []
                        last_idx = 0
                        for match in re.finditer(r'\[(.*?)\]\((.*?)\)', line):
                            # Add text before the link
                            if match.start() > last_idx:
                                parts.append(line[last_idx:match.start()])
                            
                            # Add the link
                            link_text = match.group(1)
                            link_url = match.group(2)
                            parts.append(f'<link href="{link_url}" color="blue"><u>{link_text}</u></link>')
                            
                            last_idx = match.end()
                        
                        # Add any remaining text
                        if last_idx < len(line):
                            parts.append(line[last_idx:])
                        
                        line = ''.join(parts)
                    except Exception as e:
                        # If link processing fails, use the original line
                        logger.error(f"Error processing links: {e}")
                
                # Add the paragraph
                story.append(Paragraph(line, normal_style))
            
            i += 1
        
        # Flush any remaining list
        if in_list and list_items:
            story.append(ListFlowable(
                [ListItem(Paragraph(item, list_item_style)) for item in list_items],
                bulletType='bullet',
                leftIndent=10,
                bulletFontName='Helvetica',
                bulletFontSize=10,
                bulletOffsetY=0,
                bulletDedent=10,
                spaceAfter=0
            ))
        
        # Build the PDF
        doc.build(story)
        
        logger.info(f"Successfully generated PDF: {output_pdf}")
    
    except Exception as e:
        error_msg = f"Error generating PDF: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg)
