import { loadFixture, ethers, expect } from "./setup";
import { AlbumTracker, AlbumTracker__factory, Album__factory } from "../typechain-types";
import { ContractTransactionReceipt, BaseContract } from "ethers";

describe("AlbumTracker", function() {
	async function deploy() {
		const [ owner, buyer ] = await ethers.getSigners();

		const AlbumTracker = await ethers.getContractFactory("AlbumTracker");

		const tracker = await AlbumTracker.deploy();
		
		await tracker.waitForDeployment();

		return { tracker, owner, buyer };
	};

	it("deploy albums", async function() {
		const { tracker, buyer } = await loadFixture(deploy);
		
		const albumTitle = "Enchantment of the Ring";
		const albumPrice = ethers.parseEther("0.00005");
		
		await createAlbum(tracker, albumTitle, albumPrice);

		const expectedAlbumAddr = await precomputeAddress(
			tracker, 
			await ethers.provider.getTransactionCount(tracker.target) - 1
		);

		const album = Album__factory.connect(expectedAlbumAddr, buyer);

		expect(await album.price()).to.eq(albumPrice);
		expect(await album.title()).to.eq(albumTitle);
		expect(await album.index()).to.eq(0);
		expect(await album.purchased()).to.be.false;
	});

	it("creates albums", async function() {
		const { tracker } = await loadFixture(deploy);
		
		const albumTitle = "Enchantment of the Ring";
		const albumPrice = ethers.parseEther("0.00005");
		
		const receiptTx = await createAlbum(tracker, albumTitle, albumPrice);

		const expectedAlbumAddr = await precomputeAddress(
			tracker, 
			await ethers.provider.getTransactionCount(tracker.target) - 1
		);

		const album = await tracker.albums(0);

		expect(album.album).to.eq(expectedAlbumAddr);
		expect(album.state).to.eq(0n);
		expect(album.price).to.eq(albumPrice);
		expect(album.title).to.eq(albumTitle);
		
		const currentIndex = await ethers.provider.getStorage(tracker.target, 2);
		expect(parseInt(currentIndex.charAt(currentIndex.length - 1), 10)).to.eq(1);
		expect(await tracker.currentIndex()).to.eq(1);


		const log = receiptTx?.logs[0] as any;
		expect(log.args[0]).to.eq(expectedAlbumAddr);
		expect(log.topics[1]).to.eq(
			ethers.zeroPadValue(expectedAlbumAddr, 32)
		);

		await expect(receiptTx).to.emit(tracker, "AlbumStateChanged").withArgs(
			expectedAlbumAddr,
			0,
			0,
			albumTitle
		);
	});

	it("allows to buy albums", async function() {
		const { tracker, buyer } = await loadFixture(deploy);
		
		const albumTitle = "Enchantment of the Ring";
		const albumPrice = ethers.parseEther("0.00005");
		
		await createAlbum(tracker, albumTitle, albumPrice);

		const expectedAlbumAddr = await precomputeAddress(
			tracker, 
			await ethers.provider.getTransactionCount(tracker.target) - 1
		);
		
		const album = Album__factory.connect(expectedAlbumAddr, buyer);
		
		expect(await ethers.provider.getBalance(tracker.target)).to.eq(0n);
		expect(await album.purchased()).to.be.false;

		const failedTxData = {
			to: expectedAlbumAddr,
			value: 1
		};

		await expect(buyer.sendTransaction(failedTxData)).to.be.revertedWith("We accept only full payments!");
		await expect(tracker.triggerPayment(0, { value: albumPrice })).to.be.revertedWith('Only Album contract can call this function!');
		await expect(tracker.triggerPayment(0)).to.be.revertedWith("We accept only full payments!");
		

		const txData = {
			to: expectedAlbumAddr,
			value: albumPrice,
		};

		const buyTx = await buyer.sendTransaction(txData);
		await buyTx.wait();

		expect(await album.purchased()).to.be.true;
		expect(await ethers.provider.getBalance(tracker.target)).to.eq(albumPrice);
		expect((await tracker.albums(0)).state).to.eq(1);
		
		await expect(buyTx).to.changeEtherBalances(
			[tracker, buyer], 
			[albumPrice, -albumPrice],
		);

		await expect(buyer.sendTransaction(txData)).to.be.revertedWith("This album is already purchased!");
		
		await expect(tracker.triggerPayment(0)).to.be.revertedWith("This album is already purchased!");
	});

	it("triggerDelivery", async function () {
		const { tracker, buyer } = await loadFixture(deploy);
		
		const albumTitle = "Enchantment of the Ring";
		const albumPrice = ethers.parseEther("0.00005");

		await createAlbum(tracker, albumTitle, albumPrice);	

		await expect(tracker.triggerDelivery(0)).to.be.revertedWith('This album is not paid for!')

		const expectedAlbumAddr = await precomputeAddress(
			tracker, 
			await ethers.provider.getTransactionCount(tracker.target) - 1
		);
		
		const album = Album__factory.connect(expectedAlbumAddr, buyer);

		const txData = {
			to: expectedAlbumAddr,
			value: albumPrice,
		};

		const buyTx = await buyer.sendTransaction(txData);
		await buyTx.wait();

		expect(await album.purchased()).to.be.true;
		expect(await ethers.provider.getBalance(tracker.target)).to.eq(albumPrice);
		expect((await tracker.albums(0)).state).to.eq(1);
		
		await expect(buyTx).to.changeEtherBalances(
			[tracker, buyer], 
			[albumPrice, -albumPrice],
		);
		
		await expect(tracker.triggerDelivery(0)).to.emit(tracker, "AlbumStateChanged").withArgs(
			expectedAlbumAddr,
			0,
			2,
			albumTitle
		);
		

		await expect(tracker.connect(buyer).triggerDelivery(0)).to.be.revertedWithCustomError(tracker, "OwnableUnauthorizedAccount");
	})

	async function precomputeAddress(sc: BaseContract, nonce = 1): Promise<string> {
		return ethers.getCreateAddress({
			from: await sc.getAddress(),
			nonce: nonce,
		});
	}

	async function createAlbum(tracker: AlbumTracker, title: string, price: bigint): Promise<ContractTransactionReceipt | null> {
		const createAlbumTx = await tracker.createAlbum(price, title);

		return await createAlbumTx.wait();
	}
});