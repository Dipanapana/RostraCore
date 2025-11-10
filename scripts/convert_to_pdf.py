#!/usr/bin/env python3
"""
Convert Executive Business Overview markdown to professional PDF document.
"""
import re
from pathlib import Path
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.platypus import ListFlowable, ListItem
from reportlab.lib import colors

# RostraCore brand colors
COLOR_NAVY = HexColor('#0A2540')
COLOR_ORANGE = HexColor('#FF6B35')
COLOR_GREEN = HexColor('#2D6A4F')
COLOR_GRAY = HexColor('#64748B')

def create_professional_pdf():
    """Create a professionally formatted PDF from markdown."""

    # Read the markdown file
    md_path = Path(__file__).parent.parent / 'docs' / 'EXECUTIVE_BUSINESS_OVERVIEW.md'
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Create PDF
    output_path = Path(__file__).parent.parent / 'docs' / 'RostraCore_Executive_Business_Overview.pdf'
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )

    # Build styles
    styles = setup_styles()

    # Parse markdown and build story
    story = []
    lines = content.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i].rstrip()

        # Skip table of contents
        if '## Table of Contents' in line:
            i += 1
            while i < len(lines) and not lines[i].startswith('##'):
                i += 1
            continue

        # Handle horizontal rules
        if line.strip() == '---':
            story.append(Spacer(1, 0.2 * inch))
            story.append(Paragraph('<hr width="100%"/>', styles['Normal']))
            story.append(Spacer(1, 0.2 * inch))
            i += 1
            continue

        # Handle blockquotes
        if line.startswith('> '):
            text = line[2:]
            text = clean_markdown(text)
            story.append(Paragraph(text, styles['Quote']))
            story.append(Spacer(1, 0.15 * inch))
            i += 1
            continue

        # Handle headings
        if line.startswith('#'):
            level = len(re.match(r'^#+', line).group())
            text = line.lstrip('#').strip()
            text = clean_markdown(text)

            if level == 1:
                if story:  # Add page break before new sections (except first)
                    story.append(PageBreak())
                story.append(Paragraph(text, styles['Heading1']))
                story.append(Spacer(1, 0.3 * inch))
            elif level == 2:
                story.append(Spacer(1, 0.2 * inch))
                story.append(Paragraph(text, styles['Heading2']))
                story.append(Spacer(1, 0.2 * inch))
            elif level == 3:
                story.append(Spacer(1, 0.15 * inch))
                story.append(Paragraph(text, styles['Heading3']))
                story.append(Spacer(1, 0.1 * inch))
            else:
                story.append(Paragraph(text, styles['Heading4']))
                story.append(Spacer(1, 0.1 * inch))

            i += 1
            continue

        # Handle tables
        if '|' in line and line.strip().startswith('|'):
            table_data = []
            while i < len(lines) and '|' in lines[i]:
                cells = [cell.strip() for cell in lines[i].split('|')[1:-1]]
                # Skip separator rows
                if not all(re.match(r'^:?-+:?$', cell) for cell in cells):
                    table_data.append([clean_markdown(cell) for cell in cells])
                i += 1

            if table_data:
                # Create table
                table = Table(table_data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), COLOR_NAVY),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('TOPPADDING', (0, 1), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ]))
                story.append(table)
                story.append(Spacer(1, 0.2 * inch))
            continue

        # Handle bullet lists
        if line.strip().startswith('- ') or line.strip().startswith('* '):
            bullet_items = []
            while i < len(lines) and (lines[i].strip().startswith('- ') or lines[i].strip().startswith('* ')):
                text = lines[i].strip()[2:]
                text = clean_markdown(text)
                bullet_items.append(Paragraph(text, styles['BulletText']))
                i += 1

            if bullet_items:
                story.append(ListFlowable(
                    bullet_items,
                    bulletType='bullet',
                    start='•'
                ))
                story.append(Spacer(1, 0.1 * inch))
            continue

        # Handle numbered lists
        if re.match(r'^\d+\. ', line.strip()):
            numbered_items = []
            while i < len(lines) and re.match(r'^\d+\. ', lines[i].strip()):
                text = re.sub(r'^\d+\. ', '', lines[i].strip())
                text = clean_markdown(text)
                numbered_items.append(Paragraph(text, styles['BulletText']))
                i += 1

            if numbered_items:
                story.append(ListFlowable(
                    numbered_items,
                    bulletType='1'
                ))
                story.append(Spacer(1, 0.1 * inch))
            continue

        # Handle regular paragraphs
        if line.strip():
            text = clean_markdown(line)
            story.append(Paragraph(text, styles['BodyText']))
            story.append(Spacer(1, 0.1 * inch))
        else:
            story.append(Spacer(1, 0.05 * inch))

        i += 1

    # Build PDF
    doc.build(story)
    print(f"✓ Professional PDF document created: {output_path}")
    print(f"  File size: {output_path.stat().st_size / 1024:.1f} KB")
    return output_path

def setup_styles():
    """Set up professional document styles."""
    styles = getSampleStyleSheet()

    # Override existing styles
    styles['Heading1'].fontName = 'Helvetica-Bold'
    styles['Heading1'].fontSize = 24
    styles['Heading1'].textColor = COLOR_NAVY
    styles['Heading1'].spaceAfter = 12
    styles['Heading1'].spaceBefore = 12
    styles['Heading1'].alignment = TA_LEFT

    styles['Heading2'].fontName = 'Helvetica-Bold'
    styles['Heading2'].fontSize = 18
    styles['Heading2'].textColor = COLOR_NAVY
    styles['Heading2'].spaceAfter = 10
    styles['Heading2'].spaceBefore = 10

    styles['Heading3'].fontName = 'Helvetica-Bold'
    styles['Heading3'].fontSize = 14
    styles['Heading3'].textColor = COLOR_GREEN
    styles['Heading3'].spaceAfter = 8
    styles['Heading3'].spaceBefore = 8

    styles['Heading4'].fontName = 'Helvetica-Bold'
    styles['Heading4'].fontSize = 12
    styles['Heading4'].textColor = COLOR_GRAY
    styles['Heading4'].spaceAfter = 6

    styles['BodyText'].fontName = 'Helvetica'
    styles['BodyText'].fontSize = 11
    styles['BodyText'].leading = 14
    styles['BodyText'].alignment = TA_JUSTIFY

    # Add new custom styles
    styles.add(ParagraphStyle(
        name='Quote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        textColor=COLOR_GREEN,
        leftIndent=20,
        rightIndent=20,
        spaceAfter=12
    ))

    styles.add(ParagraphStyle(
        name='BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leftIndent=20,
        spaceAfter=4
    ))

    return styles

def clean_markdown(text):
    """Clean markdown formatting for PDF."""
    if not text:
        return text

    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)

    # Italic
    text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
    text = re.sub(r'_(.+?)_', r'<i>\1</i>', text)

    # Code
    text = re.sub(r'`(.+?)`', r'<font name="Courier">\1</font>', text)

    # Links (convert to text with URL)
    text = re.sub(r'\[(.+?)\]\((.+?)\)', r'\1', text)

    # Clean up any remaining markdown
    text = text.replace('*', '')

    return text

if __name__ == '__main__':
    create_professional_pdf()
