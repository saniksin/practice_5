# The Graph Subgraph for Ethereum Contract

This project demonstrates how to use **The Graph** to index events from an Ethereum smart contract. It sets up an event indexer and queryable API for your contract's events such as `Deposit` and `Withdrawal`.

## Project Structure

- **Subgraph Definition**: The subgraph tracks `Deposit` and `Withdrawal` events emitted by the Ethereum contract.
- **Schema**: Defines the entities (`User`, `Deposit`, `Withdrawal`) that are indexed and stored.
- **Mappings**: Handlers that process events and update the subgraph.

## Setup

### Prerequisites

- Node.js and npm installed
- A deployed Ethereum contract
- A local or hosted instance of The Graph Node

### Installation

1. **Install Dependencies**:
   ```bash
   npm install
    ```

2. Generate Code: This step generates TypeScript code based on your GraphQL schema and ABIs.

    ```bash
    graph codegen && graph build
    ```

3. Generate Code: This step generates deploy your GraphQL.

    ```bash
    graph deploy --studio nativebank
    ```    