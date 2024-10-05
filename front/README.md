# Music Shop Hardhat Project

This project includes two parts:
1) **MusicShop**: Solidity contracts for managing a music album shop.
2) **Simple Frontend**: A Next.js frontend to interact with the MusicShop smart contract, aimed at practicing contract functionality.

The project is created for educational purposes as part of practice for OTUS.

## To Set Up the Project:

1. **Install Smart Contract Dependencies**:

   ```bash
   npm install
   ```

2. Review the code to understand its functionality.

3. Run the tests:

   ```bash
   npx hardhat test
   ```

4. Navigate to the `front/front` directory.

5. **Install Frontend Dependencies**:

   ```bash
   npm install
   ```

6. Run the frontend project:

   ```bash
   npm run dev
   ```

7. In another terminal window, start the Hardhat node:

   ```bash
   npx hardhat node
   ```

8. In another terminal window, deploy contracts:

   ```bash
   npx hardhat run scripts/deploy.ts --network localhost
   ```

9. Add your local Hardhat network to MetaMask:
   Example: http://localhost:8545

10. Import the first two Hardhat wallets into MetaMask:
   - `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` - Role: User
   - `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` - Role: Owner

11. Open [http://localhost:3000](http://localhost:3000) in your browser.

12. Connect your wallet.

13. Use the app:
   - **Owner**: Can create and buy albums.
   - **User**: Can only buy albums.

14. If you see ``Nonce too high. Expected nonce to be 1 but got 16. Note that transactions can't be queued when automining.`` reset metamask activity data.