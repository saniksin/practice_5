import { MusicShop__factory } from "../typechain-types";
import { loadFixture, ethers, expect, time } from "./setup";
import { MusicShop } from "../typechain-types";

describe("MusicShop", function() {
    async function deploy() {
        const [owner, buyer] = await ethers.getSigners();

        const MusicShop = await ethers.getContractFactory("MusicShop");
        const shop = await MusicShop.deploy(owner.address);
        await shop.waitForDeployment();

        return { shop, owner, buyer }
    }

    async function createAlbum(shop: MusicShop) {
        const title = "Demo";
        const price = 100;
        const uid = ethers.solidityPackedKeccak256(["string"], [title]);
        const qty = 5;
        const initialIndex = 0;
        
        const addTx = await shop.addAlbum(uid, title, price, qty);
        await addTx.wait();
        
        return { title, price, uid, qty, initialIndex }
    }

    it("should allow to add albums", async function () {
        const { shop } = await loadFixture(deploy);

        // cоздание альбома
        const { title, price, uid, qty, initialIndex } = await createAlbum(shop)
        
        const album = await shop.albums(initialIndex);

        expect(album.index).to.eq(initialIndex);
        expect(album.uid).to.eq(uid);
        expect(album.title).to.eq(title);
        expect(album.price).to.eq(price);
        expect(album.quantity).to.eq(qty);

        expect(await shop.currentIndex()).to.eq(initialIndex + 1);
    });

    it("should allow to buy", async function () {
        const { shop, buyer } = await loadFixture(deploy);

        const initialOrderId = 0;

        expect(await shop.currentOrderId()).to.eq(initialOrderId);

        const { price, uid, initialIndex } = await createAlbum(shop)

        const album = await shop.albums(initialIndex);

        await expect(shop.connect(buyer).buy(initialIndex, {value: price - 1})).to.be.revertedWith("invalid price")


        const buyTx = await shop.connect(buyer).buy(initialIndex, {value: price});
        const receipt = await buyTx.wait();

        for (let i = 1; i <= 4; i++) {
            await shop.connect(buyer).buy(initialIndex, {value: price});
            await buyTx.wait();
        }
        
        await expect(shop.connect(buyer).buy(initialIndex, {value: price})).to.be.revertedWith("out of stock!")
        
        await expect(buyTx).to.changeEtherBalances([shop, buyer], [price, -price]);
        
        expect(receipt).not.to.be.undefined;
        const block = await ethers.provider.getBlock(receipt!.blockNumber);
        const timestamp = block?.timestamp;

        await expect(buyTx).to.emit(shop, "AlbumBought").withArgs(uid, buyer.address, timestamp);
        await expect(await shop.currentOrderId()).to.eq(5n);

        const order = await shop.orders(initialOrderId);

        expect(order.orderId).to.eq(initialIndex);
        expect(order.albumUid).to.eq(uid);
        expect(order.customer).to.eq(buyer.address);
        expect(order.orderedAt).to.eq(timestamp);
        expect(order.status).to.eq(0);
        expect((await shop.albums(initialIndex)).quantity).to.eq(
            album.quantity - 5n,
        );
    });

    it("should not allow to buy via receive", async function () {
        const { shop, buyer } = await loadFixture(deploy);

        const txData = {
            to: shop.target,
            value: 100
        };

        await expect(buyer.sendTransaction(txData)).to.be.revertedWith(
            "Please use the buy function to purchase albums!"
        )
    });

    it("should allow to trigger delivery", async function() {
        const { shop, buyer } = await loadFixture(deploy);

        const albumIdxToBuy = 0
        
        const { uid, price, initialIndex } = await createAlbum(shop)

        const buyTx = await shop.connect(buyer).buy(initialIndex, {value: price});
        await buyTx.wait();

        const beforeTx = await shop.orders(initialIndex);
        expect(beforeTx.status).to.eq(0n);

        const triggerDeliveryTx = await shop.delivered(albumIdxToBuy);
        await triggerDeliveryTx.wait();

        await expect(shop.connect(buyer).delivered(albumIdxToBuy)).to.be.rejectedWith("not an owner!");
        await expect(shop.delivered(albumIdxToBuy)).to.be.revertedWith("invalid status");

        const afterTx = await shop.orders(initialIndex);
        expect(afterTx.status).to.eq(1n);

        await expect(triggerDeliveryTx).to.emit(shop, "OrderDelivered").withArgs(uid, buyer.address);

        
    });

    it("onlyOwner can add albums", async function() {
        const { shop, buyer } = await loadFixture(deploy);
        
        const title = "Demo";
        const price = 100;
        const uid = ethers.solidityPackedKeccak256(["string"], [title]);
        const qty = 5;
        
        await expect(shop.connect(buyer).addAlbum(uid, title, price, qty)).to.revertedWith('not an owner!');
        await expect(shop.addAlbum(uid, title, price, qty)).not.be.reverted;
    })

    it("checkAlbum value", async function () {
        const { shop } = await loadFixture(deploy);

        const beforeAddAlbum = await shop.allAlbums();
        expect(beforeAddAlbum).to.be.an('array').that.is.empty;
        const { title, price, uid, qty, initialIndex } = await createAlbum(shop);
        const afterAddAlbum = await shop.allAlbums();
        expect(afterAddAlbum).to.be.an('array').that.is.not.empty;
        expect(afterAddAlbum[0]).to.deep.equal([
            initialIndex,
            uid,
            title,
            price,
            qty
        ]);
    })
})