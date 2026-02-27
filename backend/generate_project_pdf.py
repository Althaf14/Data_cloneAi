
from fpdf import FPDF
import datetime

class ProjectPDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 12)
        self.cell(0, 10, 'Data_CloneAI Project Documentation', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

    def chapter_title(self, title):
        self.set_font('Arial', 'B', 16)
        self.cell(0, 10, title, 0, 1, 'L')
        self.ln(5)

    def chapter_body(self, body):
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 6, body)
        self.ln()

    def draw_entity(self, x, y, w, h, text):
        self.rect(x, y, w, h)
        self.set_xy(x, y + h/2 - 3)
        self.set_font('Arial', 'B', 10)
        self.cell(w, 6, text, 0, 0, 'C')

    def draw_process(self, x, y, r, text):
        # Approximate circle with 4 bezier curves or just use an ellipse instruction if available?
        # FPDF doesn't have circle easily, let's use rect with rounded corners or just rect for DFD process (standard is circle/oval but rect is common in some tools, Gane-Sarson uses rounded rect).
        # Let's use Rounded Rect for process
        self.set_fill_color(240, 240, 240)
        self.rect(x, y, r*2, r*1.5, style='FD') # width, height
        self.set_xy(x, y + r*1.5/2 - 3)
        self.set_font('Arial', 'B', 9)
        self.cell(r*2, 6, text, 0, 0, 'C')
    
    def draw_datastore(self, x, y, w, h, text):
        # Open rectangle (missing right side)
        self.line(x, y, x+w, y)
        self.line(x, y, x, y+h)
        self.line(x, y+h, x+w, y+h)
        self.set_xy(x, y + h/2 - 3)
        self.set_font('Arial', '', 9)
        self.cell(w, 6, text, 0, 0, 'C')

    def draw_arrow(self, x1, y1, x2, y2):
        self.line(x1, y1, x2, y2)
        # Simple arrowhead
        # Calculate angle? No, strictly vertical/horizontal for simplicity
        if x2 > x1: # Right
            self.line(x2, y2, x2-2, y2-2)
            self.line(x2, y2, x2-2, y2+2)
        elif x2 < x1: # Left
            self.line(x2, y2, x2+2, y2-2)
            self.line(x2, y2, x2+2, y2+2)
        elif y2 > y1: # Down
            self.line(x2, y2, x2-2, y2-2)
            self.line(x2, y2, x2+2, y2-2)
        elif y2 < y1: # Up
            self.line(x2, y2, x2-2, y2+2)
            self.line(x2, y2, x2+2, y2+2)

pdf = ProjectPDF()
pdf.add_page()

# 1. Abstract
pdf.chapter_title('1. Project Abstract')
abstract_text = (
    "Data_CloneAI is an advanced forensic document analysis system designed to combat identity fraud "
    "and document forgery in the digital age. Leveraging state-of-the-art machine learning algorithms, "
    "including deep learning-based forgery detection and optical character recognition (OCR) verification, "
    "the system provides a robust platform for verifying the authenticity of identity documents such as "
    "passports and national IDs.\n\n"
    "The system employs a multi-layered analysis pipeline that includes image enhancement, tamper detection, "
    "OCR consistency checks, and biometric data cross-referencing. By automating these complex forensic tasks, "
    "Data_CloneAI significantly reduces the time required for manual verification while increasing accuracy and "
    "reliability. The platform serves as a critical tool for forensic analysts, security agencies, and financial "
    "institutions, ensuring the integrity of digital identities and preventing fraudulent activities."
)
pdf.chapter_body(abstract_text)

# 2. Database Structure
pdf.add_page()
pdf.chapter_title('2. Database Structure')

def add_table_def(name, desc, rows):
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, f'TABLE NAME: {name}', 0, 1)
    pdf.set_font('Arial', 'I', 10)
    pdf.multi_cell(0, 6, desc)
    pdf.ln(2)
    
    # Table Header
    pdf.set_font('Arial', 'B', 10)
    col_w = [15, 40, 40, 95]
    headers = ['Sl no', 'Field', 'Type', 'Description']
    for i in range(4):
        pdf.cell(col_w[i], 8, headers[i], 1, 0, 'C')
    pdf.ln()
    
    # Rows
    pdf.set_font('Arial', '', 9)
    for i, row in enumerate(rows):
        pdf.cell(col_w[0], 8, str(i+1), 1, 0, 'C')
        pdf.cell(col_w[1], 8, row[0], 1, 0, 'L')
        pdf.cell(col_w[2], 8, row[1], 1, 0, 'L')
        pdf.cell(col_w[3], 8, row[2], 1, 0, 'L')
        pdf.ln()
    pdf.ln(5)

# Table 1: Users
add_table_def('Users', 'Stores information about system users including forensic analysts and administrators.', [
    ('id', 'INT', 'Primary Key, Unique identifier for the user'),
    ('username', 'VARCHAR(50)', 'Unique login username'),
    ('password_hash', 'VARCHAR(255)', 'Encrypted password string'),
    ('role', 'ENUM', "User role ('admin', 'analyst')"),
    ('full_name', 'VARCHAR(100)', 'Full legal name of the user'),
    ('email', 'VARCHAR(150)', 'Contact email address')
])

# Table 2: Identities
add_table_def('Identities', 'Stores the core identity records against which documents are verified.', [
    ('id', 'INT', 'Primary Key, Unique identity record ID'),
    ('full_name', 'VARCHAR(255)', 'Name as it appears on official records'),
    ('date_of_birth', 'DATE', 'Date of birth for age verification'),
    ('id_number', 'VARCHAR(100)', 'Unique National ID or Passport Number'),
    ('face_embedding', 'JSON', 'Vector representation of facial features'),
    ('created_at', 'TIMESTAMP', 'Record creation timestamp')
])

# Table 3: Documents
add_table_def('Documents', 'Stores metadata and status of uploaded documents for analysis.', [
    ('id', 'INT', 'Primary Key, Document ID'),
    ('identity_id', 'INT', 'Foreign Key referencing Identities table'),
    ('file_path', 'VARCHAR(255)', 'Storage path of the document image'),
    ('doc_type', 'VARCHAR(50)', 'Type of document (e.g., Passport, ID)'),
    ('status', 'ENUM', "Analysis status ('pending', 'completed')"),
    ('authenticity_score', 'FLOAT', 'Calculated probability of authenticity (0-1)')
])

# Table 4: ForensicResults
add_table_def('ForensicResults', 'Stores the detailed outcomes of the forensic analysis modules.', [
    ('id', 'INT', 'Primary Key, Result ID'),
    ('document_id', 'INT', 'Foreign Key referencing Documents table'),
    ('risk_level', 'ENUM', "Risk assessment ('low', 'medium', 'high')"),
    ('ocr_data', 'JSON', 'Extracted text data from the document'),
    ('forgery_details', 'JSON', 'Specifics of detected tampering'),
    ('analysis_date', 'TIMESTAMP', 'Date and time of analysis completion')
])

# 3. ER Diagram
pdf.add_page()
pdf.chapter_title('3. Entity Relationship (ER) Diagram')
pdf.chapter_body("The following diagram represents the Entity Relationship model using the Chen notation conventions as specified.")

# Draw Logic for ERD
start_y = pdf.get_y() + 10
center_x = 105

# Entities (Rects)
pdf.draw_entity(center_x - 20, start_y + 40, 40, 20, "ForensicAnalyst") # Central
pdf.draw_entity(center_x - 70, start_y + 100, 40, 20, "Document") # Dependent 1
pdf.draw_entity(center_x + 30, start_y + 100, 40, 20, "Report") # Dependent 2
pdf.draw_entity(center_x - 20, start_y + 160, 40, 20, "CaseFile") # Shared Core
pdf.draw_entity(center_x - 20, start_y + 220, 40, 20, "CaseType") # Classification

# Relationships (Diamonds - simulated by 4 lines)
def draw_diamond(x, y, w, h, text):
    pdf.line(x, y + h/2, x + w/2, y)
    pdf.line(x + w/2, y, x + w, y + h/2)
    pdf.line(x + w, y + h/2, x + w/2, y + h)
    pdf.line(x + w/2, y + h, x, y + h/2)
    pdf.set_xy(x, y + h/2 - 3)
    pdf.set_font('Arial', 'B', 8)
    pdf.cell(w, 6, text, 0, 0, 'C')

# R1: Analyst Uploads Document
draw_diamond(center_x - 55, start_y + 60, 30, 20, "Uploads")
pdf.line(center_x - 10, start_y + 60, center_x - 25, start_y + 70) # Analyst to Rel
pdf.line(center_x - 40, start_y + 80, center_x - 50, start_y + 100) # Rel to Doc

# R2: Analyst Generates Report
draw_diamond(center_x + 15, start_y + 60, 30, 20, "Generates")
pdf.line(center_x + 10, start_y + 60, center_x + 15, start_y + 70) # Analyst to Rel
pdf.line(center_x + 30, start_y + 80, center_x + 40, start_y + 100) # Rel to Report

# R3: Analyst Manages Action (Third action needed per prompt)
# Let's add "Manage" -> "Identity" (add another dep entity)
pdf.draw_entity(center_x + 70, start_y + 40, 30, 20, "Identity")
draw_diamond(center_x + 30, start_y + 40, 30, 15, "Manages")
pdf.line(center_x + 20, start_y + 50, center_x + 30, start_y + 47)
pdf.line(center_x + 60, start_y + 47, center_x + 70, start_y + 50)

# Links to Shared Core
# Doc -> Case
pdf.line(center_x - 50, start_y + 120, center_x - 10, start_y + 160)
# Report -> Case
pdf.line(center_x + 50, start_y + 120, center_x + 10, start_y + 160)

# Classification Relationship
draw_diamond(center_x - 15, start_y + 190, 30, 20, "Classifies")
pdf.line(center_x, start_y + 180, center_x, start_y + 190)
pdf.line(center_x, start_y + 210, center_x, start_y + 220)

pdf.add_page()

# 4. Data Flow Diagrams
pdf.chapter_title('4. Data Flow Diagrams (DFD)')

# Level 0
pdf.set_font('Arial', 'B', 12)
pdf.cell(0, 10, 'Level 0: Context Diagram', 0, 1)
start_y = pdf.get_y() + 10

# System
pdf.rect(80, start_y + 20, 50, 30, style='D')
pdf.set_xy(80, start_y + 30)
pdf.cell(50, 6, "Data_CloneAI System", 0, 0, 'C')

# Entities
pdf.draw_entity(20, start_y + 25, 30, 20, "Analyst")
pdf.draw_entity(160, start_y + 10, 30, 20, "Admin")
pdf.draw_entity(160, start_y + 50, 30, 20, "Ext API")

# Flows
pdf.draw_arrow(50, start_y + 30, 80, start_y + 30) # Analyst -> Sys
pdf.draw_arrow(80, start_y + 40, 50, start_y + 40) # Sys -> Analyst

pdf.draw_arrow(130, start_y + 25, 160, start_y + 20) # Sys -> Admin
pdf.draw_arrow(160, start_y + 25, 130, start_y + 30) # Admin -> Sys

pdf.draw_arrow(130, start_y + 45, 160, start_y + 55) # Sys -> API
pdf.draw_arrow(160, start_y + 60, 130, start_y + 50) # API -> Sys

# Level 1
pdf.ln(80)
pdf.set_font('Arial', 'B', 12)
pdf.cell(0, 10, 'Level 1: Primary User Module', 0, 1)
start_y = pdf.get_y() + 10

pdf.draw_entity(20, start_y + 30, 30, 20, "Analyst")
pdf.draw_process(70, start_y + 30, 15, "Login")
pdf.draw_arrow(50, start_y + 40, 70, start_y + 40)

# Branches
pdf.draw_process(120, start_y + 10, 15, "Upload Doc")
pdf.draw_arrow(100, start_y + 40, 120, start_y + 20)
pdf.draw_datastore(170, start_y + 10, 30, 15, "Docs DB")
pdf.draw_arrow(150, start_y + 17, 170, start_y + 17)

pdf.draw_process(120, start_y + 40, 15, "View Rpts")
pdf.draw_arrow(100, start_y + 45, 120, start_y + 45)
pdf.draw_datastore(170, start_y + 40, 30, 15, "Rpts DB")
pdf.draw_arrow(150, start_y + 47, 170, start_y + 47)

pdf.draw_process(120, start_y + 70, 15, "Mgmt Case")
pdf.draw_arrow(100, start_y + 50, 120, start_y + 75)
pdf.draw_datastore(170, start_y + 70, 30, 15, "Case DB")
pdf.draw_arrow(150, start_y + 77, 170, start_y + 77)

pdf.add_page()
# Level 1.2
pdf.set_font('Arial', 'B', 12)
pdf.cell(0, 10, 'Level 1.2: Secondary User Module (Client)', 0, 1)
start_y = pdf.get_y() + 10

pdf.draw_entity(20, start_y + 20, 30, 20, "Client")
pdf.draw_process(70, start_y + 20, 15, "Login")
pdf.draw_arrow(50, start_y + 30, 70, start_y + 30)

pdf.draw_process(120, start_y + 10, 15, "Chk Status")
pdf.draw_arrow(100, start_y + 30, 120, start_y + 20)
pdf.draw_datastore(160, start_y + 10, 30, 15, "Case DB")
pdf.draw_arrow(150, start_y + 17, 160, start_y + 17)

pdf.draw_process(120, start_y + 40, 15, "Update Info")
pdf.draw_arrow(100, start_y + 35, 120, start_y + 50)
pdf.draw_datastore(160, start_y + 40, 30, 15, "Client DB")
pdf.draw_arrow(150, start_y + 47, 160, start_y + 47)

# Level 1.3
pdf.ln(70)
pdf.set_font('Arial', 'B', 12)
pdf.cell(0, 10, 'Level 1.3: Tertiary User Module (Admin)', 0, 1)
start_y = pdf.get_y() + 10

pdf.draw_entity(20, start_y + 20, 30, 20, "Admin")
pdf.draw_process(70, start_y + 20, 15, "Login")
pdf.draw_arrow(50, start_y + 30, 70, start_y + 30)

pdf.draw_process(120, start_y + 10, 15, "Sys Config")
pdf.draw_arrow(100, start_y + 30, 120, start_y + 20)
pdf.draw_datastore(160, start_y + 10, 30, 15, "Config DB")
pdf.draw_arrow(150, start_y + 17, 160, start_y + 17) # Read/Write implied

pdf.draw_process(120, start_y + 40, 15, "User Mgmt")
pdf.draw_arrow(100, start_y + 35, 120, start_y + 50)
pdf.draw_datastore(160, start_y + 40, 30, 15, "User DB")
pdf.draw_arrow(150, start_y + 47, 160, start_y + 47)

pdf.output("Project_Documentation.pdf")
print("PDF Generated Successfully: Project_Documentation.pdf")
