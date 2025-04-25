# Crypto Mchanga Application (Microservice Architecture)

**Crypto Mchanga** is a decentralized application (DApp) built to bridge M-Pesa and Ethereum networks, allowing users to send funds between them seamlessly. The project is structured in a microservices architecture, with separate components for the frontend, backend, smart contract interactions, and middleware.

## Frontend
- **Hosted:** [Crypto Mchanga Frontend](https://crypto-mchanga.vercel.app/)
- **Code:** [Frontend GitHub Repository](https://github.com/eric-mwakazi/Crypto-M-Changa-FE)

## Backend (Smart Contract)
- **Hosted Contract:** [Crypto Mchanga Smart Contract on Sepolia](https://sepolia.etherscan.io/address/0xDaD4BdaC8398f3c6060346F49D081b28155E2085#code)
- **Code:** [Backend GitHub Repository](https://github.com/eric-mwakazi/Crypto-M-Changa-BE)

## MPesa to ETH Middleware
- **Hosted Contract:** [MPesa to ETH Middleware Contract on Sepolia](https://sepolia.etherscan.io/address/0x2c6D6ffeC97A5acB0598447a8D328802AB419B02#code)
- **Code:** [Middleware GitHub Repository](https://github.com/eric-mwakazi/ETHMPESA)

## Contract Interaction with Node API
- **Hosted API:** [MPesa to ETH Bridge API](https://mpesa-to-eth-bridge-api.vercel.app)
- **Code:** [API GitHub Repository](https://github.com/eric-mwakazi/MpesaToEthBridge-api)

---

## Architecture Overview

### 1. **Frontend**
   - Built with React and deployed to Vercel for a seamless user experience.
   - Integrates with the backend to interact with the Ethereum network and the M-Pesa bridge.

### 2. **Backend (Smart Contract)**
   - Deployed on the Sepolia test network.
   - Allows ETH transfers and manages the logic for conversions between ETH and M-Pesa.

### 3. **MPesa to ETH Middleware**
   - Provides the crucial bridge between M-Pesa and Ethereum, allowing users to fund their ETH wallet using M-Pesa.

### 4. **Contract Interaction with Node API**
   - A Node.js API that handles requests between the frontend and the smart contracts.
   - Facilitates smooth communication between the M-Pesa STK push, the Ethereum network, and the user's frontend application.
   
---

Feel free to check out the project’s various components and contribute or offer feedback!

