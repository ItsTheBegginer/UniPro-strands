# Pre-Existing Work Disclosure

This project was developed for the **Agents for Humans Hackathon** during the official submission period.

The author had previously developed an experimental university application automation concept named **UniPro**.

Pre-existing work and concepts incorporated into this project are identified below, strictly complying with the hackathon rules to disclose any pre-existing code.

## Incorporated Pre-Existing Work
- **Database Schema & SQLite Persistence**: The underlying data schema for storing user profiles.
- **Frontend Dashboard Shell**: The Next.js React component structure for the UI dashboard.
- **Playwright Automation Adapters**: The deterministic browser automation scripts used to interact with university portals.

## New Work Developed for the Hackathon
The following components were built specifically for this hackathon submission, utilizing **Strands Agents** and **Amazon Bedrock**:
- **Agent Orchestration Loop**: The core Strands agent that manages the application lifecycle.
- **AWS Bedrock Integration**: Migration of the reasoning and extraction engine to Amazon Bedrock.
- **Strands Tools**: Refactoring of legacy functions into Strands-compatible tools.
- **Human-in-the-loop Approval System**: The entire state machine around pausing execution for human feedback and notifications.
- **AWS Infrastructure**: Preparation for S3/DynamoDB integration.
- **End-to-end Demo Scenario**: The specific hackathon user journey demonstrating Everyday Agents capabilities.
