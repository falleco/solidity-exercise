//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


/// @notice A contract for a RPG game using smart contracts and tons of creativity.
/// @author falleco
contract RPGGame is Ownable, ERC721URIStorage, Initializable {
    using Counters for Counters.Counter;

    enum ActionTypes {
        ATTACK,
        HEAL,
        SPELL
    }
    uint public constant PLAYERS_FULL_HP = 100;
    uint public constant LEVEL_STEP = 10;
    uint public constant SPELL_COOLDOWN = 24 hours;

    ////////////////
    // Structures //
    ////////////////
    struct Boss {
        address punkId;
        string name;
        uint hp;
        uint damage;
        uint reward;
    }

    struct Character {
        address player;
        string name;
        uint hp;
        uint damage;
        uint xp;
        uint level;
        bool created;
    }

    ////////////
    // Events //
    ////////////
    event BossCreated(uint256 bossId);
    event BossKilled(uint256 bossId);
    event PlayerKilled(address player);
    event AttackRound(
        uint256 bossId,
        uint bossDamage,
        address player,
        uint playerDamage,
        ActionTypes actionType
    );
    event CharacterCreated(address player);
    event CharacterRevived(address sourcePlayer, address targetPlayer);
    event RewardGranted(
        address player,
        uint256 bossId,
        uint reward,
        uint256 mintId
    );

    ///////////
    // State //
    ///////////
    mapping(uint256 => Boss) public Bosses;
    Counters.Counter private _currentBoss;
    mapping(address => Character) public Characters;

    mapping(address => uint) public SpellLastUsage;

    mapping(uint256 => mapping(address => bool)) public RewardClaims;
    Counters.Counter private _tokenIds;

    function initialize() external initializer{
        ERC721("RPG NFT", "NFT");
    }

    ///////////////
    // Modifiers //
    ///////////////

    /// @notice LALALALA
    modifier isAllowedToAct(ActionTypes actionType) {
        if (actionType == ActionTypes.HEAL) {
            require(
                Characters[msg.sender].level >= 1,
                "You need to have at least level 1 to heal."
            );
        }

        if (actionType == ActionTypes.SPELL) {
            require(
                Characters[msg.sender].level >= 2,
                "You need to have at least level 2 to use spells."
            );
        }

        // Common attacks are always allowed.
        _;
    }

    modifier spellIsCooledDown() {
        require(
            block.timestamp - SpellLastUsage[msg.sender] >= SPELL_COOLDOWN,
            "You have to wait to use the spell again."
        );
        _;
    }

    modifier isNotDead() {
        require(
            Characters[msg.sender].hp > 0,
            "Cannot execute this action when dead, ask for heal first."
        );
        _;
    }

    modifier existsAndIsDead(address player) {
        require(
            Characters[player].created && Characters[player].hp <= 0,
            "The player doesn't exist or it's not dead."
        );
        _;
    }

    modifier canClaimRewards(uint256 bossId) {
        require(
            Bosses[bossId].hp <= 0 && RewardClaims[bossId][msg.sender],
            "The player is not allowed to claim rewards for this boss."
        );
        _;
    }

    modifier bossCanBeAttacked() {
        require(
            Bosses[_currentBoss.current()].hp > 0,
            "Cannot execute this action on the boss it is already dead."
        );
        _;
    }

    modifier currentBossIsDead() {
        require(
            Bosses[_currentBoss.current()].hp <= 0,
            "Only one alive boss is allowed."
        );
        _;
    }

    modifier isNotSelf() {
        require(
            msg.sender == msg.sender,
            "You cannot execute this action on yourself."
        );
        _;
    }

    modifier onlyOneCharAllowed() {
        require(
            !Characters[msg.sender].created,
            "Only 1 character per user is allowed."
        );
        _;
    }

    //////////////////
    // Initializers //
    //////////////////

    /// @notice Create OR update a boss, only the contract owner can perform this action.
    /// @param punkId the cryptopunk asset id to use as the boss identity
    /// @return boss
    function createBoss(
        address punkId,
        string memory name,
        uint hp,
        uint damage,
        uint reward
    ) public onlyOwner currentBossIsDead returns (Boss memory) {
        _currentBoss.increment();
        uint256 newBossId = _currentBoss.current();

        Bosses[newBossId] = Boss({
            punkId: punkId,
            name: name,
            hp: hp,
            damage: damage,
            reward: reward
        });

        emit BossCreated(newBossId);
        return Bosses[newBossId];
    }

    function createCharacter(string memory name)
        public
        onlyOneCharAllowed
        returns (Character memory)
    {
        Characters[msg.sender] = Character({
            player: msg.sender,
            name: name,
            hp: PLAYERS_FULL_HP,
            damage: 10,
            xp: 0,
            level: 0,
            created: true
        });

        emit CharacterCreated(msg.sender);
        return (Characters[msg.sender]);
    }

    function giveXP(address player, uint amount) public onlyOwner {
        applyLeveling(player, amount);
    }

    function applyLeveling(address player, uint amount) private {
        (uint256 newLevel, uint256 remainingXP) = leveling(
            Characters[player].level,
            Characters[player].xp + amount
        );
        Characters[player].level = newLevel;
        Characters[player].xp = remainingXP;
    }

    ///////////////////////
    // Private Functions //
    ///////////////////////
    function leveling(uint256 currentLevel, uint256 totalXP)
        private
        pure
        returns (uint256, uint256)
    {
        uint256 levelIncrease = totalXP / LEVEL_STEP;
        return (currentLevel + levelIncrease, totalXP % LEVEL_STEP);
    }

    function append(
        string memory a,
        string memory b,
        string memory c,
        string memory d,
        string memory e
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b, c, d, e));
    }

    function stringToBytes32(string memory source)
        public
        pure
        returns (bytes memory result)
    {
        assembly {
            result := mload(add(source, 32))
        }
    }

    function mintRewardToken(uint256 bossId, uint reward)
        private
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _safeMint(msg.sender, newItemId);
        _setTokenURI(
            newItemId,
            append(
                Strings.toString(bossId),
                "|",
                Strings.toString(uint160(block.timestamp)),
                "|",
                Strings.toString(reward)
            )
        );
        return (newItemId);
    }

    function attackBoss(ActionTypes actionType, uint damageAmount)
        private
        returns (uint, uint)
    {
        uint256 bossId = _currentBoss.current();
        // given that the player can attack the boss, let the round happen
        Bosses[bossId].hp = Bosses[bossId].hp >= damageAmount
            ? Bosses[bossId].hp - damageAmount
            : 0;
        Characters[msg.sender].hp = Characters[msg.sender].hp >=
            Bosses[bossId].damage
            ? Characters[msg.sender].hp - Bosses[bossId].damage
            : 0;
        emit AttackRound(
            bossId,
            damageAmount,
            msg.sender,
            Bosses[bossId].damage,
            actionType
        );

        // kills the boss if it's hp reaches 0
        if (Bosses[bossId].hp <= 0) {
            emit BossKilled(bossId);
        }

        // kills the player if it's hp reaches 0
        if (Characters[msg.sender].hp <= 0) {
            emit PlayerKilled(msg.sender);
        }

        // the player attacked, so it is allowed to claim this boss rewards
        if (!RewardClaims[bossId][msg.sender]) {
            RewardClaims[bossId][msg.sender] = true;
        }

        return (damageAmount, Bosses[bossId].damage);
    }

    //////////////////////
    // Public Functions //
    //////////////////////
    function attack()
        public
        isNotDead
        bossCanBeAttacked
        isAllowedToAct(ActionTypes.ATTACK)
        returns (uint, uint)
    {
        return attackBoss(ActionTypes.ATTACK, Characters[msg.sender].damage);
    }

    function castSpell()
        public
        isNotDead
        bossCanBeAttacked
        isAllowedToAct(ActionTypes.SPELL)
        spellIsCooledDown
        returns (uint, uint)
    {
        (uint playerDamage, uint bossDamage) = attackBoss(
            ActionTypes.SPELL,
            Characters[msg.sender].damage * 2
        );
        SpellLastUsage[msg.sender] = block.timestamp;
        return (playerDamage, bossDamage);
    }

    function heal(address targetPlayer)
        public
        isNotSelf
        isNotDead
        existsAndIsDead(targetPlayer)
        isAllowedToAct(ActionTypes.HEAL)
    {
        Characters[targetPlayer].hp = PLAYERS_FULL_HP;
        Characters[targetPlayer].xp = 0;
        emit CharacterRevived(msg.sender, targetPlayer);
    }

    function claimRewards(uint256 bossId)
        public
        isNotDead
        canClaimRewards(bossId)
    {
        RewardClaims[bossId][msg.sender] = false;
        Characters[msg.sender].xp =
            Characters[msg.sender].xp +
            Bosses[bossId].reward;
        uint256 mintId = mintRewardToken(bossId, Bosses[bossId].reward);
        emit RewardGranted(msg.sender, bossId, Bosses[bossId].reward, mintId);

        applyLeveling(msg.sender, Bosses[bossId].reward);
    }

    ///////////////////
    // Public Views //
    ///////////////////
    function getActiveBoss() public view returns (Boss memory) {
        return Bosses[_currentBoss.current()];
    }

    function getMyCharacter() public view returns (Character memory) {
        return Characters[msg.sender];
    }
}
