# Tree Protection Compliance Monitoring App

An AI-assisted, database-connected web application designed for **Melbourne Tree Care (MTC)** to improve how tree monitoring data is recorded and managed during construction projects.

🔗 **Live App:** https://tree-protection-monitoring-app.vercel.app/

---

## Overview

Tree protection monitoring during construction often involves spreadsheets, PDFs, site drawings, photos, and manual inspection notes. This makes it difficult for arborists and project teams to keep tree records, inspection history, and compliance status organised.

This app provides a practical digital workflow for managing project information, tree inventory, site visits, and tree-level compliance records in one system.

## Business Problem

Melbourne Tree Care (MTC) needs to record and manage tree monitoring data during construction projects. Arborists need to know:

- which trees require protection
- what protection measures are required
- whether each tree is compliant, at risk, or flagged
- what observations were recorded during inspections
- what changed since the last visit

Without a structured system, this process can become manual, fragmented, and time-consuming.

---

## Key Features

- Manage multiple construction projects
- Store and view tree inventory data
- Track tree protection compliance status
- Record inspection visits and observations
- View tree-level visit history
- Connect project and tree data through a live database
- Prepare structured records for future reporting

---

## Technical Stack

**Front End**
- React
- TypeScript
- Vite
- Tailwind CSS

**Backend / Database**
- Supabase
- PostgreSQL
- Relational database design
- API-based data access

**Deployment**
- GitHub
- Vercel

**AI-assisted Development**
- Figma AI
- Codex
- Claude / AI coding assistants


## Data and API Integration

The app uses **Supabase PostgreSQL** as the backend database and connects it to the React front end through the Supabase client API.

Core database entities include:

- `projects`
- `trees`
- `visits`
- `tree_visit_records`

Implemented data flows include:

- fetching project records from Supabase
- loading trees based on the selected project
- opening tree detail pages using live database records
- creating visit records
- linking inspection records to specific trees and projects
- displaying tree-level visit history

This demonstrates practical experience with live database integration, API-based data operations, and relational data modelling.


## AI-assisted Development

This project was built using a human-in-the-loop AI development workflow.

AI tools were used to support:

- UI generation from Figma-based prompts
- React and TypeScript debugging
- Supabase query troubleshooting
- front-end and database field alignment
- code refactoring
- deployment issue diagnosis

I used AI as a development assistant while making the key decisions around product logic, database structure, workflow design, and business requirements.

---

## My Role

I worked on this project as a **Technical Consultant and AI-assisted Developer**, responsible for translating Melbourne Tree Care’s tree monitoring workflow into a working digital prototype.

My work included understanding the business problem, designing the app structure, building the front end, setting up Supabase database tables, connecting live database records, debugging project/tree/visit logic, and deploying the app through Vercel.

---

## Skills Demonstrated

- AI-assisted development
- Supabase / PostgreSQL database integration
- API-based data operations
- React and TypeScript
- Product workflow design
- GitHub and Vercel deployment

---

## Running the Project Locally

Install dependencies:

```bash
npm install
