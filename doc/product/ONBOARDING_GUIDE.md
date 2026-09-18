# OmniEdu Unified Educational ERP — Trust & Campus Onboarding Guide

This guide provides step-by-step procedures for Trust Chairmen, IT Directors, and Campus Principals to set up organizations, provision campuses, configure academic years, and ingest legacy records.

---

## 1. Trust & Organization Registration

1. **Access the Onboarding Wizard**:
   - Navigate to `/onboard` or click **Get Started** on the landing page.
   - Enter your Organization Name (e.g. `Apollo Educational Trust`), Organization Slug (`apollo-trust`), and primary administrator contact.

2. **Select Initial Campus Modality**:
   - **Engineering / Arts College**: Configures Anna University regulations, department hierarchies, and CIA grade schemes.
   - **K-12 Matriculation School**: Configures CBSE standards (Classes 1–12), sections, and unit tests.
   - **Dual Educational Trust**: Provisions both modalities under unified governance.

3. **Master Administrator Credentials**:
   - Create the Root `ORG_ADMIN` account with email and password.
   - Upon completion, the system automatically initializes tenant database partitions, seeds baseline regulations, and issues your initial access token.

---

## 2. Campus Setup & Visual Branding

1. **Access Campus Settings**:
   - Navigate to **Admin Console** → **Campuses & Facilities** (`/app/admin/institutions`).
   - Click the **Branding & Regional Locale** tab.

2. **Configure Institutional Identity**:
   - **Logo Emblem**: Provide a high-resolution HTTPS URL to your institution's coat-of-arms or crest.
   - **Theme Accent Color**: Pick your institution's primary hex color (e.g. `#4F46E5` for Royal Indigo, `#059669` for Emerald).
   - **Timezone**: Set to `Asia/Kolkata (IST)` or your regional operational timezone.
   - **Official Report Footer**: Set standard compliance text for transcripts and hall tickets (e.g., `Apollo Institute of Technology • Affiliated to Anna University`).

---

## 3. Bulk Data Ingestion

OmniEdu features an enterprise CSV ingestion wizard with pre-validation dry runs:

1. **Navigate to Data Import**:
   - Open **Navigation** → **Bulk Data Ingestion** (`/app/import`).
2. **Select Entity Pipeline**:
   - Choose entity type: `STUDENTS`, `FACULTY`, `COURSES`, `CLASSES`, or `SUBJECTS`.
3. **Upload CSV & Map Columns**:
   - Download the template CSV or upload your legacy SIS export.
   - Map legacy columns (e.g. `Registration_No` → `regNumber`, `Full_Name` → `fullName`).
4. **Dry Run Validation**:
   - Click **Run Pre-flight Validation**. The engine inspects for duplicates, malformed emails, and foreign key mismatches without modifying the live database.
5. **Commit Import**:
   - Click **Commit Validated Records**. The system performs atomic multi-row inserts and generates an audit log entry.

---

## 4. User Invitation & Role Assignment

1. **Invite Faculty & HODs**:
   - Go to **Admin Console** → **User Directory** (`/app/admin/users`).
   - Click **Invite User**, enter corporate email, and select institution role (`HOD`, `FACULTY`, `CLASS_ADVISOR`, or `INSTITUTION_ADMIN`).
2. **Assign Academic Scopes**:
   - Bind faculty members to specific departments, courses, and section advisor duties.
3. **Student & Parent Portal Activation**:
   - Once student records are enrolled, parent portal accounts are auto-provisioned based on parent mobile numbers and verified relationship links.
