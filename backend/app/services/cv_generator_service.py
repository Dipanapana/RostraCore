"""CV Generator Service - Generate professional CVs for security guards."""

from typing import Dict, Any, Optional
from datetime import datetime
import os
from pathlib import Path
from io import BytesIO

try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError) as e:
    WEASYPRINT_AVAILABLE = False
    HTML = None


class CVGeneratorService:
    """Service for generating professional CVs."""

    @staticmethod
    def get_template_html(template_name: str, cv_data: Dict[str, Any]) -> str:
        """Get HTML for CV template."""

        if template_name == "professional":
            return CVGeneratorService._professional_template(cv_data)
        elif template_name == "modern":
            return CVGeneratorService._modern_template(cv_data)
        elif template_name == "classic":
            return CVGeneratorService._classic_template(cv_data)
        elif template_name == "executive":
            return CVGeneratorService._executive_template(cv_data)
        elif template_name == "minimalist":
            return CVGeneratorService._minimalist_template(cv_data)
        else:
            raise ValueError(f"Unknown template: {template_name}")

    @staticmethod
    def generate_pdf(template_name: str, cv_data: Dict[str, Any], output_path: str) -> str:
        """
        Generate PDF from CV template.

        Args:
            template_name: Name of the CV template to use
            cv_data: Dictionary containing guard data
            output_path: Full path where PDF should be saved

        Returns:
            Path to the generated PDF file
        """
        if not WEASYPRINT_AVAILABLE:
            raise RuntimeError(
                "WeasyPrint is not available. PDF generation requires WeasyPrint and GTK libraries. "
                "Please see https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation"
            )

        # Get HTML content
        html_content = CVGeneratorService.get_template_html(template_name, cv_data)

        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        # Generate PDF using WeasyPrint
        HTML(string=html_content).write_pdf(output_path)

        return output_path

    @staticmethod
    def generate_pdf_bytes(template_name: str, cv_data: Dict[str, Any]) -> bytes:
        """
        Generate PDF as bytes (for direct download without saving to disk).

        Args:
            template_name: Name of the CV template to use
            cv_data: Dictionary containing guard data

        Returns:
            PDF content as bytes
        """
        # Get HTML content
        html_content = CVGeneratorService.get_template_html(template_name, cv_data)

        # Generate PDF to bytes
        pdf_bytes = HTML(string=html_content).write_pdf()

        return pdf_bytes

    @staticmethod
    def _professional_template(data: Dict[str, Any]) -> str:
        """Professional CV Template - Clean and corporate."""

        skills_html = ""
        if data.get('skills'):
            skills_list = ', '.join(data['skills'])
            skills_html = f"""
            <div class="section">
                <h2>Skills & Competencies</h2>
                <p>{skills_list}</p>
            </div>
            """

        languages_html = ""
        if data.get('languages'):
            languages_list = ', '.join(data['languages'])
            languages_html = f"""
            <div class="section">
                <h2>Languages</h2>
                <p>{languages_list}</p>
            </div>
            """

        references_html = ""
        if data.get('references'):
            refs_content = ""
            for ref in data['references']:
                refs_content += f"""
                <div class="reference">
                    <p><strong>{ref.get('name', 'N/A')}</strong></p>
                    <p>{ref.get('company', '')} - {ref.get('position', '')}</p>
                    <p>Tel: {ref.get('phone', 'N/A')}</p>
                </div>
                """
            references_html = f"""
            <div class="section">
                <h2>References</h2>
                {refs_content}
            </div>
            """

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CV - {data.get('full_name', 'Professional')}</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
        }}
        body {{
            font-family: 'Arial', sans-serif;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }}
        .header {{
            background: #2c3e50;
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
        }}
        .header h1 {{
            margin: 0;
            font-size: 32px;
            font-weight: bold;
        }}
        .header .subtitle {{
            font-size: 18px;
            margin-top: 10px;
            opacity: 0.9;
        }}
        .contact-info {{
            text-align: center;
            margin-top: 15px;
            font-size: 14px;
        }}
        .contact-info span {{
            margin: 0 15px;
        }}
        .section {{
            margin-bottom: 25px;
        }}
        h2 {{
            color: #2c3e50;
            font-size: 20px;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }}
        .info-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }}
        .info-item {{
            padding: 8px;
            background: #f8f9fa;
        }}
        .info-item strong {{
            color: #2c3e50;
        }}
        .certification-box {{
            background: #e8f4f8;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 10px 0;
        }}
        .reference {{
            margin-bottom: 15px;
            padding: 10px;
            background: #f8f9fa;
        }}
        .footer {{
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ecf0f1;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{data.get('full_name', 'Professional Security Guard')}</h1>
        <div class="subtitle">PSIRA-Certified Security Professional</div>
        <div class="contact-info">
            <span>📧 {data.get('email', '')}</span>
            <span>📱 {data.get('phone', '')}</span>
            <span>📍 {data.get('city', '')}, {data.get('province', '')}</span>
        </div>
    </div>

    <div class="section">
        <h2>Professional Profile</h2>
        <p>
            {data.get('years_experience', 0)} years of experience in the security industry.
            PSIRA-certified (Grade {data.get('psira_grade', 'N/A')}) security professional seeking
            opportunities in {', '.join(data.get('provinces_willing_to_work', [data.get('province', 'Various provinces')]))}.
            Committed to maintaining safety and security with professionalism and integrity.
        </p>
    </div>

    <div class="section">
        <h2>PSIRA Certification</h2>
        <div class="certification-box">
            <div class="info-grid">
                <div class="info-item">
                    <strong>PSIRA Number:</strong> {data.get('psira_number', 'N/A')}
                </div>
                <div class="info-item">
                    <strong>Grade:</strong> Grade {data.get('psira_grade', 'N/A')}
                </div>
                <div class="info-item">
                    <strong>Expiry Date:</strong> {data.get('psira_expiry_date', 'N/A')}
                </div>
                <div class="info-item">
                    <strong>Status:</strong> Active
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Personal Information</h2>
        <div class="info-grid">
            <div class="info-item">
                <strong>ID Number:</strong> {data.get('id_number', 'Available on request')}
            </div>
            <div class="info-item">
                <strong>Date of Birth:</strong> {data.get('date_of_birth', 'N/A')}
            </div>
            <div class="info-item">
                <strong>Gender:</strong> {data.get('gender', 'N/A')}
            </div>
            <div class="info-item">
                <strong>Drivers License:</strong> {'Yes (' + data.get('drivers_license_code', '') + ')' if data.get('has_drivers_license') else 'No'}
            </div>
            <div class="info-item">
                <strong>Firearm Competency:</strong> {'Yes (Valid until ' + str(data.get('firearm_competency_expiry', '')) + ')' if data.get('has_firearm_competency') else 'No'}
            </div>
            <div class="info-item">
                <strong>Provinces Available:</strong> {', '.join(data.get('provinces_willing_to_work', [data.get('province', 'N/A')]))}
            </div>
        </div>
    </div>

    {skills_html}

    {languages_html}

    <div class="section">
        <h2>Work Availability</h2>
        <div class="info-grid">
            <div class="info-item">
                <strong>Current Status:</strong> {'Available for immediate employment' if data.get('available_for_work') else 'Currently employed'}
            </div>
            <div class="info-item">
                <strong>Expected Rate:</strong> R{data.get('hourly_rate_expectation', 'Negotiable')}/hour
            </div>
        </div>
    </div>

    {references_html}

    <div class="footer">
        CV Generated: {datetime.now().strftime('%d %B %Y')} | Professional Template
    </div>
</body>
</html>
"""

    @staticmethod
    def _modern_template(data: Dict[str, Any]) -> str:
        """Modern CV Template - Bold and contemporary."""

        skills_badges = ""
        if data.get('skills'):
            for skill in data['skills']:
                skills_badges += f'<span class="badge">{skill}</span>'

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CV - {data.get('full_name', 'Modern')}</title>
    <style>
        @page {{
            size: A4;
            margin: 1.5cm;
        }}
        body {{
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #2c3e50;
            margin: 0;
            padding: 0;
            line-height: 1.5;
        }}
        .sidebar {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            width: 35%;
            float: left;
            min-height: 100vh;
            box-sizing: border-box;
        }}
        .main-content {{
            padding: 40px 30px;
            width: 65%;
            float: right;
            box-sizing: border-box;
        }}
        .sidebar h1 {{
            font-size: 28px;
            margin: 0 0 10px 0;
            font-weight: bold;
        }}
        .sidebar .role {{
            font-size: 16px;
            opacity: 0.95;
            margin-bottom: 30px;
            font-weight: 300;
        }}
        .sidebar-section {{
            margin-bottom: 25px;
        }}
        .sidebar-section h3 {{
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
            opacity: 0.9;
        }}
        .sidebar-section p {{
            font-size: 13px;
            margin: 5px 0;
            line-height: 1.6;
        }}
        .psira-badge {{
            background: rgba(255, 255, 255, 0.2);
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }}
        .psira-badge .grade {{
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }}
        .psira-badge .label {{
            font-size: 12px;
            opacity: 0.9;
        }}
        .main-content h2 {{
            color: #667eea;
            font-size: 22px;
            margin-bottom: 15px;
            font-weight: 600;
        }}
        .main-content h2:before {{
            content: "▸ ";
            color: #764ba2;
        }}
        .profile-text {{
            font-size: 15px;
            line-height: 1.8;
            color: #34495e;
            margin-bottom: 25px;
        }}
        .badge {{
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 13px;
            margin: 5px 5px 5px 0;
        }}
        .info-row {{
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #ecf0f1;
        }}
        .info-row:last-child {{
            border-bottom: none;
        }}
        .info-label {{
            font-weight: 600;
            color: #7f8c8d;
            font-size: 14px;
        }}
        .info-value {{
            color: #2c3e50;
            font-size: 14px;
        }}
        .contact-item {{
            margin: 8px 0;
            font-size: 13px;
        }}
        .contact-item strong {{
            display: block;
            margin-bottom: 3px;
            font-size: 11px;
            opacity: 0.8;
        }}
    </style>
</head>
<body>
    <div class="sidebar">
        <h1>{data.get('full_name', 'Security Professional')}</h1>
        <div class="role">PSIRA-Certified Security Guard</div>

        <div class="psira-badge">
            <div class="label">PSIRA GRADE</div>
            <div class="grade">{data.get('psira_grade', 'N/A')}</div>
            <div class="label">REG: {data.get('psira_number', 'N/A')}</div>
        </div>

        <div class="sidebar-section">
            <h3>Contact</h3>
            <div class="contact-item">
                <strong>EMAIL</strong>
                {data.get('email', '')}
            </div>
            <div class="contact-item">
                <strong>PHONE</strong>
                {data.get('phone', '')}
            </div>
            <div class="contact-item">
                <strong>LOCATION</strong>
                {data.get('city', '')}, {data.get('province', '')}
            </div>
        </div>

        <div class="sidebar-section">
            <h3>Experience</h3>
            <p>{data.get('years_experience', 0)} years in security industry</p>
        </div>

        <div class="sidebar-section">
            <h3>Availability</h3>
            <p>{'Available immediately' if data.get('available_for_work') else 'Currently employed'}</p>
            <p><strong>Rate:</strong> R{data.get('hourly_rate_expectation', 'Negotiable')}/hr</p>
        </div>

        <div class="sidebar-section">
            <h3>Languages</h3>
            <p>{', '.join(data.get('languages', ['English'])) if data.get('languages') else 'English'}</p>
        </div>

        <div class="sidebar-section">
            <h3>Willing to Work</h3>
            <p>{', '.join(data.get('provinces_willing_to_work', [data.get('province', 'N/A')])) if data.get('provinces_willing_to_work') else data.get('province', 'N/A')}</p>
        </div>
    </div>

    <div class="main-content">
        <h2>Professional Profile</h2>
        <div class="profile-text">
            Dedicated and reliable security professional with {data.get('years_experience', 0)} years of experience.
            PSIRA-certified Grade {data.get('psira_grade', 'N/A')} with a strong commitment to safety, security,
            and professional service delivery. Proven ability to maintain vigilance and respond effectively to
            security incidents while providing excellent customer service.
        </div>

        <h2>Certifications & Qualifications</h2>
        <div class="info-row">
            <span class="info-label">PSIRA Registration</span>
            <span class="info-value">{data.get('psira_number', 'N/A')} (Grade {data.get('psira_grade', 'N/A')})</span>
        </div>
        <div class="info-row">
            <span class="info-label">PSIRA Expiry</span>
            <span class="info-value">{data.get('psira_expiry_date', 'N/A')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Drivers License</span>
            <span class="info-value">{'Yes - Code ' + data.get('drivers_license_code', '') if data.get('has_drivers_license') else 'No'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Firearm Competency</span>
            <span class="info-value">{'Yes - Valid until ' + str(data.get('firearm_competency_expiry', '')) if data.get('has_firearm_competency') else 'No'}</span>
        </div>

        <h2>Skills & Competencies</h2>
        <div style="margin: 15px 0;">
            {skills_badges if skills_badges else '<span class="badge">Security Patrol</span><span class="badge">Access Control</span><span class="badge">Incident Response</span>'}
        </div>

        <h2>Personal Details</h2>
        <div class="info-row">
            <span class="info-label">ID Number</span>
            <span class="info-value">{data.get('id_number', 'Available on request')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Date of Birth</span>
            <span class="info-value">{data.get('date_of_birth', 'N/A')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Gender</span>
            <span class="info-value">{data.get('gender', 'N/A')}</span>
        </div>
    </div>

    <div style="clear: both;"></div>
</body>
</html>
"""

    @staticmethod
    def _classic_template(data: Dict[str, Any]) -> str:
        """Classic CV Template - Traditional and formal."""

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CV - {data.get('full_name', 'Classic')}</title>
    <style>
        @page {{
            size: A4;
            margin: 2.5cm;
        }}
        body {{
            font-family: 'Times New Roman', 'Georgia', serif;
            color: #000;
            line-height: 1.8;
            margin: 0;
            padding: 0;
            font-size: 12pt;
        }}
        .header {{
            text-align: center;
            border-bottom: 3px double #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            font-size: 28pt;
            margin: 0;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        }}
        .header .subtitle {{
            font-size: 14pt;
            margin-top: 10px;
            font-style: italic;
        }}
        .contact-line {{
            margin-top: 15px;
            font-size: 11pt;
        }}
        .section {{
            margin-bottom: 25px;
        }}
        .section-title {{
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            margin-bottom: 15px;
            letter-spacing: 1px;
        }}
        .subsection {{
            margin-left: 20px;
            margin-bottom: 15px;
        }}
        .subsection-title {{
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 5px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        td {{
            padding: 8px;
            border: 1px solid #000;
            font-size: 11pt;
        }}
        td.label {{
            width: 40%;
            font-weight: bold;
            background: #f5f5f5;
        }}
        .psira-box {{
            border: 2px solid #000;
            padding: 15px;
            text-align: center;
            margin: 20px 0;
            background: #f9f9f9;
        }}
        .psira-box .number {{
            font-size: 18pt;
            font-weight: bold;
            margin: 10px 0;
        }}
        ul {{
            margin: 10px 0;
            padding-left: 40px;
        }}
        li {{
            margin: 5px 0;
        }}
        .declaration {{
            margin-top: 40px;
            font-size: 11pt;
            font-style: italic;
        }}
        .signature-line {{
            margin-top: 50px;
            border-top: 1px solid #000;
            width: 300px;
            text-align: center;
            padding-top: 5px;
            font-size: 10pt;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{data.get('full_name', 'Curriculum Vitae')}</h1>
        <div class="subtitle">Private Security Industry Regulatory Authority (PSIRA) Certified</div>
        <div class="contact-line">
            {data.get('email', '')} | {data.get('phone', '')} | {data.get('city', '')}, {data.get('province', '')}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Personal Information</div>
        <table>
            <tr>
                <td class="label">Full Name</td>
                <td>{data.get('full_name', 'N/A')}</td>
            </tr>
            <tr>
                <td class="label">Identity Number</td>
                <td>{data.get('id_number', 'Available upon request')}</td>
            </tr>
            <tr>
                <td class="label">Date of Birth</td>
                <td>{data.get('date_of_birth', 'N/A')}</td>
            </tr>
            <tr>
                <td class="label">Gender</td>
                <td>{data.get('gender', 'N/A')}</td>
            </tr>
            <tr>
                <td class="label">Residential Address</td>
                <td>{', '.join(filter(None, [data.get('street_address', ''), data.get('suburb', ''), data.get('city', ''), data.get('province', ''), data.get('postal_code', '')]))}</td>
            </tr>
            <tr>
                <td class="label">Contact Number</td>
                <td>{data.get('phone', 'N/A')}</td>
            </tr>
            <tr>
                <td class="label">Email Address</td>
                <td>{data.get('email', 'N/A')}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">PSIRA Registration</div>
        <div class="psira-box">
            <div style="font-size: 12pt; font-weight: bold;">PRIVATE SECURITY INDUSTRY REGULATORY AUTHORITY</div>
            <div class="number">Registration Number: {data.get('psira_number', 'N/A')}</div>
            <table style="margin: 10px auto; width: 80%; border: none;">
                <tr>
                    <td style="border: none; text-align: left;"><strong>Grade:</strong> {data.get('psira_grade', 'N/A')}</td>
                    <td style="border: none; text-align: right;"><strong>Expiry:</strong> {data.get('psira_expiry_date', 'N/A')}</td>
                </tr>
            </table>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Professional Experience</div>
        <div class="subsection">
            <p><strong>Years of Experience:</strong> {data.get('years_experience', 0)} years in the private security industry</p>
            <p><strong>Availability:</strong> {'Available for immediate employment' if data.get('available_for_work') else 'Currently employed'}</p>
            <p><strong>Hourly Rate:</strong> R{data.get('hourly_rate_expectation', 'Negotiable')} per hour</p>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Qualifications & Licenses</div>
        <table>
            <tr>
                <td class="label">PSIRA Registration</td>
                <td>Grade {data.get('psira_grade', 'N/A')} - Valid until {data.get('psira_expiry_date', 'N/A')}</td>
            </tr>
            <tr>
                <td class="label">Drivers License</td>
                <td>{'Code ' + data.get('drivers_license_code', '') + ' - Valid' if data.get('has_drivers_license') else 'None'}</td>
            </tr>
            <tr>
                <td class="label">Firearm Competency</td>
                <td>{'Valid until ' + str(data.get('firearm_competency_expiry', '')) if data.get('has_firearm_competency') else 'Not applicable'}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Skills & Competencies</div>
        <ul>
            {('<li>' + '</li><li>'.join(data.get('skills', ['Security patrol and monitoring', 'Access control management', 'Incident response and reporting'])) + '</li>') if data.get('skills') else '<li>Security patrol and monitoring</li><li>Access control management</li><li>Incident response and reporting</li>'}
        </ul>
    </div>

    <div class="section">
        <div class="section-title">Languages</div>
        <ul>
            {('<li>' + '</li><li>'.join(data.get('languages', ['English'])) + '</li>') if data.get('languages') else '<li>English</li>'}
        </ul>
    </div>

    <div class="section">
        <div class="section-title">Provinces Willing to Work</div>
        <p style="margin-left: 20px;">{', '.join(data.get('provinces_willing_to_work', [data.get('province', 'N/A')])) if data.get('provinces_willing_to_work') else data.get('province', 'N/A')}</p>
    </div>

    <div class="declaration">
        <p>I hereby declare that all the information provided above is true and correct to the best of my knowledge.</p>
    </div>

    <div class="signature-line">
        Signature & Date
    </div>

    <div style="margin-top: 40px; text-align: center; font-size: 10pt; color: #666;">
        Curriculum Vitae | {data.get('full_name', '')} | Page 1 of 1
    </div>
</body>
</html>
"""

    @staticmethod
    def _executive_template(data: Dict[str, Any]) -> str:
        """Executive CV Template - Premium and sophisticated."""

        skills_boxes = ""
        if data.get('skills'):
            for skill in data['skills'][:6]:  # Show top 6 skills
                skills_boxes += f'<div class="skill-box">{skill}</div>'

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CV - {data.get('full_name', 'Executive')}</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
        }}
        body {{
            font-family: 'Garamond', 'Georgia', serif;
            color: #1a1a1a;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }}
        .header {{
            background: linear-gradient(to right, #1a1a1a 0%, #2d2d2d 100%);
            color: #ffffff;
            padding: 40px;
            text-align: center;
            margin-bottom: 40px;
            position: relative;
        }}
        .header::after {{
            content: "";
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 3px;
            background: #d4af37;
        }}
        .header h1 {{
            font-size: 36px;
            margin: 0;
            font-weight: 300;
            letter-spacing: 3px;
            text-transform: uppercase;
        }}
        .header .role {{
            font-size: 16px;
            margin-top: 15px;
            color: #d4af37;
            letter-spacing: 2px;
            text-transform: uppercase;
            font-weight: 400;
        }}
        .contact-bar {{
            background: #f8f8f8;
            padding: 15px 30px;
            margin-bottom: 30px;
            border-left: 4px solid #d4af37;
            display: flex;
            justify-content: space-between;
            font-size: 13px;
        }}
        .contact-item {{
            color: #2d2d2d;
        }}
        .contact-item strong {{
            color: #1a1a1a;
            margin-right: 5px;
        }}
        .section {{
            margin-bottom: 30px;
        }}
        .section-title {{
            font-size: 20px;
            color: #1a1a1a;
            font-weight: 600;
            border-bottom: 2px solid #d4af37;
            padding-bottom: 8px;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .psira-premium {{
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: white;
            padding: 25px;
            border-radius: 5px;
            text-align: center;
            margin: 25px 0;
            position: relative;
        }}
        .psira-premium::before {{
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: #d4af37;
        }}
        .psira-premium .grade {{
            font-size: 48px;
            font-weight: bold;
            color: #d4af37;
            margin: 10px 0;
        }}
        .psira-premium .label {{
            font-size: 12px;
            letter-spacing: 2px;
            opacity: 0.9;
        }}
        .profile-summary {{
            background: #f8f8f8;
            padding: 25px;
            border-left: 4px solid #d4af37;
            font-size: 15px;
            line-height: 1.8;
            font-style: italic;
            color: #2d2d2d;
        }}
        .skill-box {{
            display: inline-block;
            background: #1a1a1a;
            color: white;
            padding: 10px 20px;
            margin: 5px;
            border-radius: 3px;
            font-size: 13px;
            font-weight: 500;
        }}
        .detail-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }}
        .detail-item {{
            padding: 15px;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-left: 3px solid #d4af37;
        }}
        .detail-label {{
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888;
            margin-bottom: 5px;
        }}
        .detail-value {{
            font-size: 15px;
            color: #1a1a1a;
            font-weight: 500;
        }}
        .qualification-card {{
            background: white;
            border: 1px solid #e0e0e0;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #d4af37;
        }}
        .qualification-card h4 {{
            margin: 0 0 10px 0;
            color: #1a1a1a;
            font-size: 16px;
        }}
        .footer-signature {{
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #d4af37;
            text-align: center;
        }}
        .footer-signature .sig-line {{
            width: 250px;
            margin: 30px auto 10px auto;
            border-bottom: 2px solid #1a1a1a;
            padding-bottom: 5px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{data.get('full_name', 'Executive Professional')}</h1>
        <div class="role">PSIRA-Certified Security Executive</div>
    </div>

    <div class="contact-bar">
        <div class="contact-item"><strong>Email:</strong> {data.get('email', '')}</div>
        <div class="contact-item"><strong>Phone:</strong> {data.get('phone', '')}</div>
        <div class="contact-item"><strong>Location:</strong> {data.get('city', '')}, {data.get('province', '')}</div>
    </div>

    <div class="section">
        <div class="section-title">Executive Summary</div>
        <div class="profile-summary">
            Distinguished security professional with {data.get('years_experience', 0)} years of comprehensive
            experience in the private security industry. PSIRA-certified Grade {data.get('psira_grade', 'N/A')}
            with a proven track record of excellence in security operations, risk management, and team leadership.
            Committed to delivering superior security services with unwavering professionalism and integrity.
        </div>
    </div>

    <div class="section">
        <div class="section-title">PSIRA Certification</div>
        <div class="psira-premium">
            <div class="label">PSIRA REGISTRATION</div>
            <div class="grade">GRADE {data.get('psira_grade', 'N/A')}</div>
            <div class="label">Registration No: {data.get('psira_number', 'N/A')}</div>
            <div class="label" style="margin-top: 10px;">Valid Until: {data.get('psira_expiry_date', 'N/A')}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Core Competencies</div>
        <div style="margin: 15px 0;">
            {skills_boxes if skills_boxes else '<div class="skill-box">Security Operations</div><div class="skill-box">Risk Management</div><div class="skill-box">Team Leadership</div>'}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Professional Qualifications</div>
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">PSIRA Registration</div>
                <div class="detail-value">{data.get('psira_number', 'N/A')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Grade & Expiry</div>
                <div class="detail-value">Grade {data.get('psira_grade', 'N/A')} - {data.get('psira_expiry_date', 'N/A')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Drivers License</div>
                <div class="detail-value">{'Code ' + data.get('drivers_license_code', '') if data.get('has_drivers_license') else 'Not specified'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Firearm Competency</div>
                <div class="detail-value">{'Valid - ' + str(data.get('firearm_competency_expiry', '')) if data.get('has_firearm_competency') else 'Not applicable'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Years of Experience</div>
                <div class="detail-value">{data.get('years_experience', 0)} Years</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Availability</div>
                <div class="detail-value">{'Available Immediately' if data.get('available_for_work') else 'Currently Employed'}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Languages</div>
        <p style="font-size: 15px; color: #2d2d2d;">{', '.join(data.get('languages', ['English'])) if data.get('languages') else 'English'}</p>
    </div>

    <div class="section">
        <div class="section-title">Geographic Availability</div>
        <p style="font-size: 15px; color: #2d2d2d;">
            <strong>Willing to work in:</strong> {', '.join(data.get('provinces_willing_to_work', [data.get('province', 'N/A')])) if data.get('provinces_willing_to_work') else data.get('province', 'N/A')}
        </p>
        <p style="font-size: 15px; color: #2d2d2d;">
            <strong>Expected Rate:</strong> R{data.get('hourly_rate_expectation', 'Negotiable')} per hour
        </p>
    </div>

    <div class="footer-signature">
        <div class="sig-line"></div>
        <p style="font-size: 12px; color: #888;">Signature & Date</p>
        <p style="font-size: 11px; color: #aaa; margin-top: 20px;">Executive CV | Generated: {datetime.now().strftime('%B %Y')}</p>
    </div>
</body>
</html>
"""

    @staticmethod
    def _minimalist_template(data: Dict[str, Any]) -> str:
        """Minimalist CV Template - Clean and simple."""

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CV - {data.get('full_name', 'Minimalist')}</title>
    <style>
        @page {{
            size: A4;
            margin: 3cm 2.5cm;
        }}
        body {{
            font-family: 'Helvetica Neue', 'Arial', sans-serif;
            color: #333;
            line-height: 1.7;
            margin: 0;
            padding: 0;
            font-size: 11pt;
        }}
        .name {{
            font-size: 32pt;
            font-weight: 300;
            color: #000;
            margin-bottom: 5px;
            letter-spacing: -1px;
        }}
        .role {{
            font-size: 13pt;
            color: #666;
            margin-bottom: 25px;
            font-weight: 300;
        }}
        .contact {{
            font-size: 10pt;
            color: #666;
            margin-bottom: 40px;
            line-height: 1.8;
        }}
        .section {{
            margin-bottom: 30px;
        }}
        h2 {{
            font-size: 11pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #000;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #000;
        }}
        .psira-minimal {{
            padding: 20px 0;
            margin: 20px 0;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
        }}
        .psira-grid {{
            display: flex;
            justify-content: space-between;
        }}
        .psira-item {{
            font-size: 10pt;
        }}
        .psira-item strong {{
            display: block;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #999;
            margin-bottom: 3px;
        }}
        .info-line {{
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            justify-content: space-between;
        }}
        .info-line:last-child {{
            border-bottom: none;
        }}
        .info-label {{
            font-size: 10pt;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 9pt;
        }}
        .info-value {{
            font-size: 10pt;
            color: #333;
        }}
        .skills-minimal {{
            font-size: 10pt;
            line-height: 2;
        }}
        .skill-item {{
            display: inline;
            margin-right: 20px;
        }}
        .skill-item:after {{
            content: "•";
            margin-left: 20px;
            color: #ccc;
        }}
        .skill-item:last-child:after {{
            content: "";
        }}
        p {{
            margin: 10px 0;
        }}
    </style>
</head>
<body>
    <div class="name">{data.get('full_name', 'Security Professional')}</div>
    <div class="role">PSIRA-Certified Security Professional</div>

    <div class="contact">
        {data.get('email', '')} • {data.get('phone', '')} • {data.get('city', '')}, {data.get('province', '')}
    </div>

    <div class="section">
        <h2>Profile</h2>
        <p>
            Security professional with {data.get('years_experience', 0)} years of experience in the private
            security industry. PSIRA-certified Grade {data.get('psira_grade', 'N/A')} with expertise in security
            operations and risk management. Available for positions in {', '.join(data.get('provinces_willing_to_work', [data.get('province', 'various provinces')])) if data.get('provinces_willing_to_work') else data.get('province', 'various provinces')}.
        </p>
    </div>

    <div class="section">
        <h2>PSIRA Registration</h2>
        <div class="psira-minimal">
            <div class="psira-grid">
                <div class="psira-item">
                    <strong>Number</strong>
                    {data.get('psira_number', 'N/A')}
                </div>
                <div class="psira-item">
                    <strong>Grade</strong>
                    Grade {data.get('psira_grade', 'N/A')}
                </div>
                <div class="psira-item">
                    <strong>Expiry</strong>
                    {data.get('psira_expiry_date', 'N/A')}
                </div>
                <div class="psira-item">
                    <strong>Status</strong>
                    Active
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Qualifications</h2>
        <div class="info-line">
            <span class="info-label">Drivers License</span>
            <span class="info-value">{'Code ' + data.get('drivers_license_code', '') if data.get('has_drivers_license') else 'None'}</span>
        </div>
        <div class="info-line">
            <span class="info-label">Firearm Competency</span>
            <span class="info-value">{'Valid until ' + str(data.get('firearm_competency_expiry', '')) if data.get('has_firearm_competency') else 'N/A'}</span>
        </div>
        <div class="info-line">
            <span class="info-label">Experience</span>
            <span class="info-value">{data.get('years_experience', 0)} years</span>
        </div>
    </div>

    <div class="section">
        <h2>Skills</h2>
        <div class="skills-minimal">
            {' '.join([f'<span class="skill-item">{skill}</span>' for skill in data.get('skills', ['Security Operations', 'Patrol', 'Access Control'])]) if data.get('skills') else '<span class="skill-item">Security Operations</span><span class="skill-item">Patrol</span><span class="skill-item">Access Control</span>'}
        </div>
    </div>

    <div class="section">
        <h2>Languages</h2>
        <p>{', '.join(data.get('languages', ['English'])) if data.get('languages') else 'English'}</p>
    </div>

    <div class="section">
        <h2>Availability</h2>
        <div class="info-line">
            <span class="info-label">Status</span>
            <span class="info-value">{'Available for immediate employment' if data.get('available_for_work') else 'Currently employed'}</span>
        </div>
        <div class="info-line">
            <span class="info-label">Expected Rate</span>
            <span class="info-value">R{data.get('hourly_rate_expectation', 'Negotiable')}/hour</span>
        </div>
        <div class="info-line">
            <span class="info-label">Willing to Relocate</span>
            <span class="info-value">{', '.join(data.get('provinces_willing_to_work', [data.get('province', 'N/A')])) if data.get('provinces_willing_to_work') else data.get('province', 'N/A')}</span>
        </div>
    </div>

    <div class="section">
        <h2>Personal Details</h2>
        <div class="info-line">
            <span class="info-label">ID Number</span>
            <span class="info-value">{data.get('id_number', 'Available on request')}</span>
        </div>
        <div class="info-line">
            <span class="info-label">Date of Birth</span>
            <span class="info-value">{data.get('date_of_birth', 'N/A')}</span>
        </div>
        <div class="info-line">
            <span class="info-label">Gender</span>
            <span class="info-value">{data.get('gender', 'N/A')}</span>
        </div>
    </div>

    <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 9pt; color: #999;">
        CV Generated {datetime.now().strftime('%B %Y')}
    </div>
</body>
</html>
"""
