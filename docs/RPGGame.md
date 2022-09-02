## `RPGGame`

A contract for a RPG game using smart contracts and tons of creativity.




### `isAllowedToAct(enum RPGGame.ActionTypes actionType)`

LALALALA



### `spellIsCooledDown()`





### `isNotDead()`





### `existsAndIsDead(address player)`





### `canClaimRewards(uint256 bossId)`





### `bossCanBeAttacked()`





### `currentBossIsDead()`





### `isNotSelf()`





### `onlyOneCharAllowed()`






### `createBoss(address punkId, string name, uint256 hp, uint256 damage, uint256 reward) → struct RPGGame.Boss` (public)

Create OR update a boss, only the contract owner can perform this action.




### `createCharacter(string name) → struct RPGGame.Character` (public)





### `giveXP(address player, uint256 amount)` (public)





### `append(string a, string b, string c, string d, string e) → string` (internal)





### `stringToBytes32(string source) → bytes result` (public)





### `attack() → uint256, uint256` (public)





### `castSpell() → uint256, uint256` (public)





### `heal(address targetPlayer)` (public)





### `claimRewards(uint256 bossId)` (public)





### `getActiveBoss() → struct RPGGame.Boss` (public)





### `getMyCharacter() → struct RPGGame.Character` (public)






### `BossCreated(uint256 bossId)`





### `BossKilled(uint256 bossId)`





### `PlayerKilled(address player)`





### `AttackRound(uint256 bossId, uint256 bossDamage, address player, uint256 playerDamage, enum RPGGame.ActionTypes actionType)`





### `CharacterCreated(address player)`





### `CharacterRevived(address sourcePlayer, address targetPlayer)`





### `RewardGranted(address player, uint256 bossId, uint256 reward, uint256 mintId)`






### `Boss`


address punkId


string name


uint256 hp


uint256 damage


uint256 reward


### `Character`


address player


string name


uint256 hp


uint256 damage


uint256 xp


uint256 level


bool created



### `ActionTypes`











