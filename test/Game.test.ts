import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { faker } from "@faker-js/faker";

async function deployTestFixture() {
  const [owner, otherAddress] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("RPGGame", owner);
  const contract = await upgrades.deployProxy(factory, [], {
    initializer: "initialize",
  });

  await contract.deployed();

  return { factory, contract, owner, otherAddress };
}

describe("RPG Game contract > As Owner", function () {
  it("only the owner should be able to generate a boss", async function () {
    // given
    const { contract, owner } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const name = faker.name.firstName();
    const hp = faker.datatype.number({ min: 100, max: 300 });
    const damage = faker.datatype.number({ min: 10, max: 30 });
    const rewards = faker.datatype.number({ min: 50, max: 100 });

    // when
    const response = await contract.createBoss(
      punkId,
      name,
      hp,
      damage,
      rewards
    );

    // then
    expect(await contract.owner()).to.equal(owner.address);
    expect(response).to.emit(contract, "BossCreatedOrUpdated").withArgs(punkId);
    expect(await contract.getActiveBoss()).to.eql([
      punkId,
      name,
      ethers.BigNumber.from(hp),
      ethers.BigNumber.from(damage),
      ethers.BigNumber.from(rewards),
    ]);
  });

  it("should refuse boss creationg not being called by the contract owner", async function () {
    // given
    const { contract, otherAddress } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const name = faker.name.firstName();
    const hp = faker.datatype.number({ min: 100, max: 300 });
    const damage = faker.datatype.number({ min: 10, max: 30 });
    const rewards = faker.datatype.number({ min: 50, max: 100 });

    // when
    const response = contract
      .connect(otherAddress)
      .createBoss(punkId, name, hp, damage, rewards);

    // then
    await expect(response).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    expect(await contract.getActiveBoss()).to.eql([
      "0x0000000000000000000000000000000000000000",
      "",
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(0),
    ]);
  });
});

describe("RPG Game contract > Character Creation > As User I", function () {
  it("should be able to generate a character", async function () {
    // given
    const { contract, owner } = await deployTestFixture();

    const name = faker.name.firstName();

    // when
    const response = await contract.createCharacter(name);

    // then
    expect(await contract.owner()).to.equal(owner.address);
    expect(response)
      .to.emit(contract, "CharacterCreated")
      .withArgs(owner.address);
  });

  it("should not be able to generate more than one character", async function () {
    // given
    const { contract } = await deployTestFixture();

    const name = faker.name.firstName();
    await contract.createCharacter(name);

    // when
    const response = contract.createCharacter(`${name}, The Second`);

    // then
    await expect(response).to.be.revertedWith(
      "Only 1 character per user is allowed."
    );
  });

  it("should return nothing as active boss if no boss is active", async function () {
    // given that I have a deployed boss with enough hp
    const { contract } = await deployTestFixture();

    // and that I have another character ready to heal
    const name = faker.name.firstName();
    await contract.createCharacter(name);

    // when
    const response = await contract.getActiveBoss();

    // then
    expect(response).to.eql([
      "0x0000000000000000000000000000000000000000",
      "",
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(0),
    ]);
  });
});

describe("RPG Game contract > Normal Attacks > As User I", function () {
  it("should be able to attack and active boss and not kill it", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 100, max: 300 });
    const bossDamage = faker.datatype.number({ min: 10, max: 30 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have an alive characters
    const name = faker.name.firstName();
    await contract.createCharacter(name);

    // when
    const response = contract.attack();

    // then
    expect(await contract.owner()).to.equal(owner.address);
    expect(response)
      .to.emit(contract, "AttackRound")
      .withArgs(punkId, 10, owner.address, bossDamage);
    expect(response).not.to.emit(contract, "BossKilled");
  });

  it("should be able to attack and active boss and kill it", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 1, max: 10 });
    const bossDamage = faker.datatype.number({ min: 10, max: 30 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have an alive characters
    const name = faker.name.firstName();
    await contract.createCharacter(name);

    // when
    const response = await contract.attack();

    // then
    expect(await contract.owner()).to.equal(owner.address);
    expect(response)
      .to.emit(contract, "AttackRound")
      .withArgs(1, 10, owner.address, bossDamage);
    expect(response).to.emit(contract, "BossKilled").withArgs(1);
    expect(await contract.getActiveBoss()).to.eqls([
      punkId,
      bossName,
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(bossDamage),
      ethers.BigNumber.from(bossRewards),
    ]);
  });
});

describe("RPG Game contract > Healing > As User I", function () {
  it("should be able to heal other players", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner, otherAddress } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 1000, max: 10000 });
    const bossDamage = faker.datatype.number({ min: 1000, max: 3000 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have a dead character
    const name = faker.name.firstName();
    await contract.connect(otherAddress).createCharacter(name);
    await contract.connect(otherAddress).attack();

    // and that I have a character ready to heal character
    await contract.createCharacter(`${name}, The Second`);
    await contract.giveXP(owner.address, 100);

    // when
    const response = await contract.heal(otherAddress.address);

    // then
    expect(response)
      .to.emit(contract, "CharacterRevived")
      .withArgs(owner.address, otherAddress.address);
  });

  it("should not be able to heal alive players", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner, otherAddress } = await deployTestFixture();

    // and that I have an alive character
    const name = faker.name.firstName();
    await contract.connect(otherAddress).createCharacter(name);

    // and that I have another character ready to heal
    await contract.createCharacter(`${name}, The Second`);
    await contract.giveXP(owner.address, 100);

    // when
    const response = contract.heal(otherAddress.address);

    // then
    await expect(response).to.be.revertedWith(
      "The player doesn't exist or it's not dead."
    );
  });

  it("should not be able to self healing", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 1000, max: 10000 });
    const bossDamage = faker.datatype.number({ min: 1000, max: 3000 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have another character ready to heal
    const name = faker.name.firstName();
    await contract.createCharacter(name);
    await contract.giveXP(owner.address, 100);
    await contract.attack();

    // when
    const response = contract.heal(owner.address);

    // then
    await expect(response).to.be.revertedWith(
      "Cannot execute this action when dead, ask for heal first."
    );
  });
});

describe("RPG Game contract > Reward Claim > As User I", function () {
  it("should be able to claim rewards for a dead boss", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 1, max: 9 });
    const bossDamage = faker.datatype.number({ min: 1, max: 5 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have another character ready to heal
    const name = faker.name.firstName();
    await contract.createCharacter(name);
    await contract.attack();

    // when
    const response = contract.claimRewards(1);

    // then
    await expect(response)
      .to.emit(contract, "RewardGranted")
      .withArgs(owner.address, 1, bossRewards, 1);

    expect(await contract.balanceOf(owner.address)).to.eqls(
      ethers.BigNumber.from(1)
    );
    expect(await contract.ownerOf(1)).to.eqls(owner.address);
    expect(await contract.tokenURI(1)).to.match(
      new RegExp(`${1}|\d+|${bossRewards}`)
    );
  });

  it("should not be able to claim rewards when the boss is still alive", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 1000, max: 9000 });
    const bossDamage = faker.datatype.number({ min: 1, max: 5 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have another character ready to heal
    const name = faker.name.firstName();
    await contract.createCharacter(name);
    await contract.attack();

    // when
    const response = contract.claimRewards(punkId);

    // then
    await expect(response).to.revertedWith(
      "The player is not allowed to claim rewards for this boss."
    );
  });

  it("should not be able to claim rewards when never fought with the boss", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner, otherAddress } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 1, max: 9 });
    const bossDamage = faker.datatype.number({ min: 1, max: 5 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have another character ready to heal
    const name = faker.name.firstName();
    await contract.createCharacter(name);
    await contract.attack();

    await contract.connect(otherAddress).createCharacter(`${name}, The Second`);

    // when
    const response = contract.connect(otherAddress).claimRewards(punkId);

    // then
    await expect(response).to.revertedWith(
      "The player is not allowed to claim rewards for this boss."
    );
  });

  it("should not be able to claim rewards twice", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 1, max: 9 });
    const bossDamage = faker.datatype.number({ min: 1, max: 5 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have another character ready to heal
    const name = faker.name.firstName();
    await contract.createCharacter(name);
    await contract.attack();
    await contract.claimRewards(1);

    // when
    const response = contract.claimRewards(1);

    // then
    await expect(response).to.revertedWith(
      "The player is not allowed to claim rewards for this boss."
    );
  });
});

describe("RPG Game contract > Spell Attack > As User I", function () {
  it("should be able to cast a spell on active boss and kill it", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 1, max: 10 });
    const bossDamage = faker.datatype.number({ min: 10, max: 30 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have an alive characters
    const name = faker.name.firstName();
    await contract.createCharacter(name);
    await contract.giveXP(owner.address, 100);

    // when
    const response = await contract.castSpell();

    // then
    expect(await contract.owner()).to.equal(owner.address);
    expect(response)
      .to.emit(contract, "AttackRound")
      .withArgs(1, 10 * 2, owner.address, bossDamage);
    expect(response).to.emit(contract, "BossKilled").withArgs(1);
    expect(await contract.getActiveBoss()).to.eqls([
      punkId,
      bossName,
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(bossDamage),
      ethers.BigNumber.from(bossRewards),
    ]);
  });

  it("should not be able to cast a spell if no level", async function () {
    // given that I have a deployed boss with enough hp
    const { contract, owner } = await deployTestFixture();

    const punkId = "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    const bossName = faker.name.firstName();
    const bossHp = faker.datatype.number({ min: 1, max: 10 });
    const bossDamage = faker.datatype.number({ min: 10, max: 30 });
    const bossRewards = faker.datatype.number({ min: 50, max: 100 });

    await contract.createBoss(
      punkId,
      bossName,
      bossHp,
      bossDamage,
      bossRewards
    );

    // and that I have an alive characters
    const name = faker.name.firstName();
    await contract.createCharacter(name);

    // when
    const response = contract.castSpell();

    // then
    await expect(response).to.revertedWith(
      "You need to have at least level 2 to use spells."
    );
  });
});
