# Tree Protection Compliance Monitoring App

An AI-assisted, database-connected web application designed for **Melbourne Tree Care (MTC)** to improve how tree monitoring data is recorded and managed during construction projects.

🔗 **Live App:** https://tree-protection-monitoring-app.vercel.app/

This project demonstrates my ability to combine **AI-assisted development, database design, API integration, product thinking, and real-world workflow automation** to turn a practical business problem into a working digital solution.

---

## Business Context

This project was developed in the context of **Melbourne Tree Care (MTC)**, an arboriculture business that provides tree protection and monitoring services for construction-related projects.

During construction, arborists need to record tree protection requirements, monitor compliance, document inspection visits, and maintain evidence for reporting. However, this information is often managed across spreadsheets, PDFs, site drawings, photos, and manual notes, making it difficult to track updates consistently across projects and trees.

This app is a practical digital solution designed to improve how tree monitoring data is recorded, managed, and reviewed during construction. It helps centralise project information, tree-level records, inspection history, and compliance status into one database-connected workflow.

---

## Why I Built This

The goal of this project was to solve a real operational problem for Melbourne Tree Care (MTC): how to manage tree protection monitoring data more efficiently during construction projects.

Tree protection compliance requires accurate and repeatable data collection. Arborists need to know:

- Which trees require protection
- What protection measures are required
- Whether those measures are currently compliant
- What issues or damage have been observed
- What has changed since the last inspection
- What evidence is available for reporting

Without a structured system, this process can become fragmented, manual, and time-consuming. This app was designed to reduce manual data handling, improve visibility of compliance status, and support more consistent inspection and reporting workflows.

---

## What This App Does

The app helps arborists and construction teams:

- Manage multiple construction projects
- Store tree inventory and protection-zone data
- View tree-level compliance information
- Record inspection visits
- Track compliance status, tree health, damage, and observations
- Maintain tree-level visit history
- Prepare structured data for reporting and future PDF / CSV export

The goal is not only to display data, but to create a practical digital workflow for site monitoring and compliance decision-making.

---

## Key Features

### Project Management

- Manage multiple construction projects
- Store project-level details
- Track project status and inspection frequency

### Tree Inventory

- Store tree-level records
- View tree details such as location, species, retention status, protection zones, and compliance status
- Support large tree inventories across different projects

### Map and Tree List View

- Display trees by selected project
- Filter trees by compliance status
- Navigate from tree list or map view to detailed tree records

### Tree Detail Page

- View tree information, required protection measures, measurements, and visit history
- Track inspection records and compliance-related observations over time

### Visit and Inspection Workflow

- Create inspection visits
- Select visit type
- Record tree-level observations
- Update compliance status, health, and damage records
- Maintain structured inspection history for reporting and audit purposes

### Reporting Preparation

- Organise project, tree, and inspection data into structured records
- Support future PDF reports, CSV exports, and compliance history review

---

## AI-assisted Development Approach

This project was built using a **human-in-the-loop AI development workflow**.

I used AI tools as technical assistants to speed up implementation, but I remained responsible for product logic, data structure, debugging decisions, and workflow design.

AI was used to support:

- UI component generation from Figma-based design prompts
- React and TypeScript debugging
- Supabase query troubleshooting
- Front-end and database field alignment
- Code refactoring
- Deployment issue diagnosis
- Iterative improvement of user workflows

This project shows my ability to work with AI tools intelligently, not just generate code. I used AI to accelerate development while applying my own judgement to validate logic, fix data issues, and connect the app to real business requirements.

---

## Data Integration and Backend Design

A key part of this project was moving from static mock data to a live database-driven application.

The app uses **Supabase PostgreSQL** as the backend database and connects it to the React front end through the Supabase client API.

Core database entities include:

- `projects`
- `trees`
- `visits`
- `tree_visit_records`

The database structure supports relationships such as:

- One project has many trees
- One project has many visits
- One visit can include multiple tree-level inspection records
- One tree can have a history of inspection records over time

This relational structure allows the app to support live project selection, tree filtering, tree detail pages, inspection history, and future reporting functions.

---

## API and Live Data Flow

The application connects the front end to Supabase through API-based data operations.

Examples of implemented data flows include:

- Fetching all projects from the database
- Loading tree records based on the selected project
- Opening tree detail pages using live tree IDs
- Reading required protection measures and tree measurements from database fields
- Creating visit records
- Linking inspection records to specific projects and trees
- Displaying tree-level visit history from saved database records
- Updating front-end views based on live database responses

This demonstrates practical experience with database-backed application logic, not only static UI design.

---

## Product and Workflow Design

The app was designed around real user workflows for arborists and construction project teams.

The main workflow modules include:

### 1. Project Setup

Project information, inspection frequency, and site-level records.

### 2. Tree Inventory

Tree list and tree detail pages showing species, location, retention status, protection zones, and compliance information.

### 3. Inspection / Visit Workflow

Create visits, select visit type, update tree records, and record site observations.

### 4. Compliance Tracking

Track whether required protection measures are compliant, at risk, or flagged.

### 5. Reporting Preparation

Prepare structured records that can support future PDF reports, CSV export, and compliance history review.

This reflects my ability to translate messy real-world processes into structured product logic.

---

## Technical Stack

### Front End

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend and Database

- Supabase
- PostgreSQL
- Relational database modelling
- Row Level Security policies
- API-based data access

### Deployment and Version Control

- GitHub
- Vercel
- Branches and pull requests
- Production deployment workflow

### AI-assisted Tools

- Figma AI
- Codex
- Claude / AI coding assistants
- Prompt-based debugging and implementation support

---

## Key Technical Problems Solved

During development, I solved several practical integration problems:

- Replaced local mock data with live Supabase project and tree data
- Fixed project selection logic across pages
- Debugged tree detail pages where some records were not displaying correctly
- Aligned front-end field names with Supabase database column names
- Connected visit records to tree-level inspection history
- Improved data consistency across project, tree, and visit modules
- Managed GitHub updates and Vercel production deployments

These problems required both technical debugging and product-level understanding of how the app should behave.

---

## My Role

I worked on this project as an AI-assisted web application developer and product analyst.

My responsibilities included:

- Understanding the tree protection monitoring workflow for Melbourne Tree Care (MTC)
- Defining the app structure based on arborist and construction-site use cases
- Designing the information architecture for projects, trees, visits, and reports
- Building and refining the front-end user interface
- Setting up Supabase database tables and relationships
- Connecting live Supabase data to the React front end
- Debugging project selection, tree detail display, and visit record logic
- Deploying the app through Vercel
- Managing source code and updates through GitHub
- Using AI tools to accelerate development while validating business and technical logic

---

## Skills Demonstrated

This project demonstrates skills in:

- AI-assisted application development
- Data integration
- Supabase and PostgreSQL
- API-based front-end/backend connection
- Data modelling for operational workflows
- React and TypeScript development
- Product thinking
- User workflow design
- Compliance process mapping
- Debugging and iterative development
- GitHub and Vercel deployment
- Translating real business requirements into a working system

---

## What Makes This Project Different

Unlike a generic demo app, this project was designed around a real business workflow for **Melbourne Tree Care (MTC)**, focusing on how arborists record, update, and manage tree monitoring data during construction.

This is not only a UI prototype.

It is a working, database-connected application that demonstrates how AI-assisted development can be used to build practical business systems faster.

The project combines:

- Real operational problem analysis
- Structured data modelling
- Live database integration
- User-centred workflow design
- AI-assisted coding and debugging
- Deployment to a public production environment

It shows my ability to operate across business analysis, data engineering logic, and AI-enabled product development.

---

## Future Improvements

Planned improvements include:

- PDF report export
- CSV export
- Photo upload for site observations
- Email reminders for scheduled inspections
- Role-based access control
- Advanced compliance dashboard
- Map visualisation for large tree inventories
- Automated compliance summary generation using AI

---

## Running the Project Locally

Install dependencies:

```bash
npm install
