// web/src/engine/tables.gen.ts
var g_table_mapDiff = [-64, 1, 64, -1];
var g_table_tilediff = [[[0, 0], [0, -1], [1, 0], [0, -1], [1, 0], [0, 0], [1, 0], [0, 0]], [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 16], [16, 0], [16, 16], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 32], [32, 0], [32, 32], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 48], [48, 0], [48, 48], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 64], [64, 0], [64, 64], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 80], [80, 0], [80, 80], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 96], [96, 0], [96, 96], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 112], [112, 0], [112, 112], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 128], [128, 0], [128, 128], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 144], [144, 0], [144, 144], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 160], [160, 0], [160, 160], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 176], [176, 0], [176, 176], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 192], [192, 0], [192, 192], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 208], [208, 0], [208, 208], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 224], [224, 0], [224, 224], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 240], [240, 0], [240, 240], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], [[0, 256], [256, 0], [256, 256], [128, 0], [128, 256], [0, 128], [256, 128], [128, 128]], [[0, 272], [272, 0], [272, 272], [128, 0], [128, 272], [0, 128], [272, 128], [128, 128]], [[0, 288], [288, 0], [288, 288], [144, 0], [144, 288], [0, 144], [288, 144], [144, 144]], [[0, 304], [304, 0], [304, 304], [144, 0], [144, 304], [0, 144], [304, 144], [144, 144]], [[0, 320], [320, 0], [320, 320], [160, 0], [160, 320], [0, 160], [320, 160], [160, 160]], [[0, 336], [336, 0], [336, 336], [160, 0], [160, 336], [0, 160], [336, 160], [160, 160]], [[0, 352], [352, 0], [352, 352], [176, 0], [176, 352], [0, 176], [352, 176], [176, 176]], [[0, 368], [368, 0], [368, 368], [176, 0], [176, 368], [0, 176], [368, 176], [176, 176]], [[0, 384], [384, 0], [384, 384], [192, 0], [192, 384], [0, 192], [384, 192], [192, 192]], [[0, 400], [400, 0], [400, 400], [192, 0], [192, 400], [0, 192], [400, 192], [192, 192]], [[0, 416], [416, 0], [416, 416], [208, 0], [208, 416], [0, 208], [416, 208], [208, 208]], [[0, 432], [432, 0], [432, 432], [208, 0], [208, 432], [0, 208], [432, 208], [208, 208]], [[0, 448], [448, 0], [448, 448], [224, 0], [224, 448], [0, 224], [448, 224], [224, 224]], [[0, 464], [464, 0], [464, 464], [224, 0], [224, 464], [0, 224], [464, 224], [224, 224]], [[0, 480], [480, 0], [480, 480], [240, 0], [240, 480], [0, 240], [480, 240], [240, 240]], [[0, 496], [496, 0], [496, 496], [240, 0], [240, 496], [0, 240], [496, 240], [240, 240]], [[0, 768], [768, 0], [768, 768], [512, 0], [512, 512], [0, 512], [512, 256], [256, 256]]];
var g_table_landscapeInfo = [{ "movementSpeed": [112, 112, 112, 160, 255, 192], "letUnitWobble": 0, "isValidForStructure": 0, "isSand": 1, "isValidForStructure2": 0, "canBecomeSpice": 1, "craterType": 1, "radarColour": 88, "spriteID": 37 }, { "movementSpeed": [160, 112, 112, 64, 255, 0], "letUnitWobble": 1, "isValidForStructure": 0, "isSand": 0, "isValidForStructure2": 0, "canBecomeSpice": 0, "craterType": 1, "radarColour": 28, "spriteID": 39 }, { "movementSpeed": [112, 160, 160, 160, 255, 192], "letUnitWobble": 0, "isValidForStructure": 0, "isSand": 1, "isValidForStructure2": 0, "canBecomeSpice": 1, "craterType": 1, "radarColour": 92, "spriteID": 41 }, { "movementSpeed": [112, 160, 160, 160, 255, 192], "letUnitWobble": 0, "isValidForStructure": 0, "isSand": 1, "isValidForStructure2": 0, "canBecomeSpice": 1, "craterType": 1, "radarColour": 89, "spriteID": 43 }, { "movementSpeed": [112, 160, 160, 112, 255, 0], "letUnitWobble": 1, "isValidForStructure": 1, "isSand": 0, "isValidForStructure2": 1, "canBecomeSpice": 0, "craterType": 2, "radarColour": 30, "spriteID": 45 }, { "movementSpeed": [160, 160, 160, 160, 255, 0], "letUnitWobble": 1, "isValidForStructure": 1, "isSand": 0, "isValidForStructure2": 1, "canBecomeSpice": 0, "craterType": 2, "radarColour": 29, "spriteID": 47 }, { "movementSpeed": [64, 0, 0, 0, 255, 0], "letUnitWobble": 1, "isValidForStructure": 0, "isSand": 0, "isValidForStructure2": 0, "canBecomeSpice": 0, "craterType": 0, "radarColour": 12, "spriteID": 49 }, { "movementSpeed": [64, 0, 0, 0, 255, 0], "letUnitWobble": 1, "isValidForStructure": 0, "isSand": 0, "isValidForStructure2": 0, "canBecomeSpice": 0, "craterType": 0, "radarColour": 133, "spriteID": 51 }, { "movementSpeed": [112, 160, 160, 160, 255, 192], "letUnitWobble": 0, "isValidForStructure": 0, "isSand": 1, "isValidForStructure2": 0, "canBecomeSpice": 1, "craterType": 1, "radarColour": 215, "spriteID": 53 }, { "movementSpeed": [112, 160, 160, 160, 255, 192], "letUnitWobble": 1, "isValidForStructure": 0, "isSand": 1, "isValidForStructure2": 0, "canBecomeSpice": 1, "craterType": 1, "radarColour": 216, "spriteID": 53 }, { "movementSpeed": [255, 255, 255, 255, 255, 0], "letUnitWobble": 0, "isValidForStructure": 1, "isSand": 0, "isValidForStructure2": 0, "canBecomeSpice": 0, "craterType": 2, "radarColour": 133, "spriteID": 51 }, { "movementSpeed": [0, 0, 0, 0, 255, 0], "letUnitWobble": 0, "isValidForStructure": 0, "isSand": 0, "isValidForStructure2": 0, "canBecomeSpice": 0, "craterType": 0, "radarColour": 65535, "spriteID": 31 }, { "movementSpeed": [0, 0, 0, 0, 255, 0], "letUnitWobble": 0, "isValidForStructure": 0, "isSand": 0, "isValidForStructure2": 0, "canBecomeSpice": 0, "craterType": 0, "radarColour": 65535, "spriteID": 31 }, { "movementSpeed": [160, 160, 160, 160, 255, 0], "letUnitWobble": 1, "isValidForStructure": 1, "isSand": 0, "isValidForStructure2": 1, "canBecomeSpice": 0, "craterType": 2, "radarColour": 29, "spriteID": 47 }, { "movementSpeed": [112, 112, 112, 160, 255, 192], "letUnitWobble": 0, "isValidForStructure": 0, "isSand": 1, "isValidForStructure2": 0, "canBecomeSpice": 1, "craterType": 1, "radarColour": 50, "spriteID": 57 }];
var g_table_actionInfo = [{ "stringID": 1, "name": "Attack", "switchType": 0, "selectionType": 1, "soundID": 21 }, { "stringID": 2, "name": "Move", "switchType": 0, "selectionType": 1, "soundID": 22 }, { "stringID": 3, "name": "Retreat", "switchType": 0, "selectionType": 3, "soundID": 21 }, { "stringID": 4, "name": "Guard", "switchType": 0, "selectionType": 3, "soundID": 21 }, { "stringID": 5, "name": "Area Guard", "switchType": 0, "selectionType": 3, "soundID": 20 }, { "stringID": 6, "name": "Harvest", "switchType": 0, "selectionType": 1, "soundID": 20 }, { "stringID": 7, "name": "Return", "switchType": 0, "selectionType": 3, "soundID": 21 }, { "stringID": 37, "name": "Stop", "switchType": 0, "selectionType": 3, "soundID": 21 }, { "stringID": 9, "name": "Ambush", "switchType": 0, "selectionType": 3, "soundID": 20 }, { "stringID": 10, "name": "Sabotage", "switchType": 0, "selectionType": 3, "soundID": 20 }, { "stringID": 11, "name": "Die", "switchType": 1, "selectionType": 3, "soundID": 65535 }, { "stringID": 12, "name": "Hunt", "switchType": 0, "selectionType": 3, "soundID": 20 }, { "stringID": 31, "name": "Deploy", "switchType": 0, "selectionType": 3, "soundID": 20 }, { "stringID": 153, "name": "Destruct", "switchType": 1, "selectionType": 3, "soundID": 20 }];
var g_table_houseInfo = [{ "name": "Harkonnen", "toughness": 200, "degradingChance": 85, "degradingAmount": 3, "minimapColor": 144, "specialCountDown": 600, "starportDeliveryTime": 10, "prefixChar": "'H'", "specialWeapon": 1, "musicWin": 6, "musicLose": 3, "musicBriefing": 24, "voiceFilename": "nhark.voc" }, { "name": "Atreides", "toughness": 77, "degradingChance": 0, "degradingAmount": 1, "minimapColor": 160, "specialCountDown": 300, "starportDeliveryTime": 10, "prefixChar": "'A'", "specialWeapon": 2, "musicWin": 7, "musicLose": 4, "musicBriefing": 25, "voiceFilename": "nattr.voc" }, { "name": "Ordos", "toughness": 128, "degradingChance": 10, "degradingAmount": 2, "minimapColor": 176, "specialCountDown": 300, "starportDeliveryTime": 10, "prefixChar": "'O'", "specialWeapon": 3, "musicWin": 5, "musicLose": 2, "musicBriefing": 26, "voiceFilename": "nordo.voc" }, { "name": "Fremen", "toughness": 10, "degradingChance": 0, "degradingAmount": 1, "minimapColor": 192, "specialCountDown": 300, "starportDeliveryTime": 0, "prefixChar": "'O'", "specialWeapon": 2, "musicWin": 5, "musicLose": 2, "musicBriefing": 65535, "voiceFilename": "afremen.voc" }, { "name": "Sardaukar", "toughness": 10, "degradingChance": 0, "degradingAmount": 1, "minimapColor": 208, "specialCountDown": 600, "starportDeliveryTime": 0, "prefixChar": "'H'", "specialWeapon": 1, "musicWin": 6, "musicLose": 3, "musicBriefing": 65535, "voiceFilename": "asard.voc" }, { "name": "Mercenary", "toughness": 0, "degradingChance": 0, "degradingAmount": 1, "minimapColor": 224, "specialCountDown": 300, "starportDeliveryTime": 0, "prefixChar": "'M'", "specialWeapon": 3, "musicWin": 7, "musicLose": 4, "musicBriefing": 65535, "voiceFilename": "amerc.voc" }];
var g_table_explosion = [[[1, 153], [2, 3], [9, 0], [1, 153], [2, 3], [0, 0]], [[1, 154], [9, 0], [2, 3], [1, 153], [2, 3], [1, 154], [2, 3], [0, 0]], [[1, 183], [6, 50], [9, 0], [5, 0], [2, 15], [1, 184], [2, 15], [0, 0]], [[1, 183], [6, 49], [9, 0], [5, 0], [2, 3], [1, 184], [2, 3], [0, 0]], [[1, 203], [6, 51], [9, 0], [5, 0], [2, 7], [1, 204], [2, 3], [1, 205], [2, 3], [1, 206], [2, 3], [1, 207], [2, 3], [0, 0]], [[3, 60], [1, 203], [6, 41], [9, 0], [5, 0], [2, 7], [1, 204], [2, 3], [1, 205], [2, 3], [1, 206], [2, 3], [1, 207], [2, 3], [0, 0]], [[1, 198], [6, 51], [9, 0], [5, 0], [2, 7], [1, 199], [2, 3], [1, 200], [2, 3], [1, 201], [2, 3], [1, 202], [2, 3], [0, 0]], [[1, 208], [6, 39], [2, 15], [1, 209], [2, 15], [1, 210], [2, 15], [1, 211], [2, 15], [1, 212], [2, 15], [0, 0]], [[1, 156], [6, 40], [9, 0], [2, 7], [1, 157], [2, 3], [1, 158], [2, 3], [1, 157], [2, 3], [5, 0], [0, 0]], [[1, 183], [6, 41], [9, 0], [5, 0], [2, 3], [1, 203], [2, 3], [4, -80], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [1, 168], [2, 15], [1, 169], [2, 15], [1, 170], [2, 15], [0, 0]], [[1, 151], [6, 49], [9, 0], [5, 0], [2, 7], [1, 152], [2, 7], [0, 0]], [[3, 60], [1, 188], [6, 51], [9, 0], [5, 0], [2, 7], [1, 189], [2, 3], [1, 190], [2, 3], [1, 191], [2, 3], [1, 192], [2, 3], [0, 0]], [[1, 213], [2, 15], [1, 214], [2, 15], [1, 215], [2, 15], [1, 216], [2, 15], [1, 217], [2, 30], [0, 0]], [[1, 218], [2, 15], [1, 219], [2, 15], [1, 220], [2, 15], [1, 221], [2, 15], [1, 222], [2, 30], [0, 0]], [[3, 60], [1, 188], [6, 51], [2, 7], [1, 189], [9, 0], [7, 0], [2, 3], [1, 190], [2, 3], [1, 191], [2, 3], [1, 192], [2, 3], [0, 0]], [[1, 183], [6, 49], [4, -80], [2, 3], [1, 184], [2, 3], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [1, 180], [2, 15], [1, 181], [2, 15], [1, 182], [2, 15], [1, 181], [2, 15], [0, 0]], [[1, 203], [6, 49], [9, 0], [8, 0], [2, 3], [1, 204], [1, 207], [2, 3], [0, 0]], [[1, 203], [6, 49], [9, 0], [8, 4], [2, 3], [1, 204], [1, 207], [2, 3], [0, 0]], [[1, 183], [6, 54], [9, 0], [2, 3], [1, 184], [2, 3], [0, 0]], [[1, 156], [6, 40], [7, 0], [2, 7], [7, 0], [1, 157], [2, 3], [7, 0], [1, 158], [2, 3], [7, 0], [1, 157], [2, 3], [7, 0], [5, 0], [0, 0]]];
var g_table_animation_structure = [[[6, 1], [3, 300], [1, 0]], [[6, 0], [1, 0]], [[6, 2], [3, 300], [1, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [6, 4], [3, 30], [6, 5], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [4, 0]], [[6, 8], [3, 30], [6, 9], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 7], [3, 30], [6, 6], [3, 30], [6, 5], [3, 30], [6, 4], [3, 30], [7, -4]], [[6, 4], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 4], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 5], [3, 30], [6, 3], [3, 30], [6, 4], [3, 30], [6, 2], [3, 30], [6, 5], [3, 30], [6, 4], [3, 30], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 5], [3, 30], [6, 6], [3, 30], [6, 7], [3, 30], [4, 0]], [[6, 8], [3, 30], [6, 9], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 8], [3, 60], [6, 9], [3, 60], [6, 6], [3, 60], [6, 5], [3, 60], [6, 2], [3, 60], [6, 3], [3, 60], [7, -4]], [[6, 2], [3, 60], [6, 3], [3, 60], [4, 0]], [[6, 2], [3, 60], [6, 5], [3, 60], [6, 6], [3, 60], [6, 9], [3, 60], [6, 8], [3, 60], [7, -4]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]], [[6, 2], [3, 30], [6, 3], [3, 30], [4, 0]]];
var g_table_unitInfo = [[{ "stringID_abbrev": 194, "name": "Carryall", "stringID_full": 195, "wsa": "carryall.wsa", "_4": { "hasShadow": 1, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 100, "fogUncoverRadius": 0, "spriteID": 89, "buildCredits": 800, "buildTime": 64, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 16, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 20, "priorityTarget": 16, "availableHouse": 63 }, 0, 10, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 1, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 32, 4, 0, 200, 3, 283, -1, 7, 1, 0, 0, 0, 0, 65535, 255, 42], [{ "stringID_abbrev": 196, "name": "'Thopter", "stringID_full": 197, "wsa": "orni.wsa", "_4": { "hasShadow": 1, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 25, "fogUncoverRadius": 5, "spriteID": 97, "buildCredits": 600, "buildTime": 96, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 28, "upgradeLevelRequired": 1, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 75, "priorityTarget": 30, "availableHouse": 62 }, 0, 10, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 1, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 4, 7, 150, 2, 289, -1, 7, 5, 0, 50, 50, 50, 0, 22, 42], [{ "stringID_abbrev": 198, "name": "Infantry", "stringID_full": 199, "wsa": "infantry.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 50, "fogUncoverRadius": 1, "spriteID": 93, "buildCredits": 100, "buildTime": 32, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 4, "upgradeLevelRequired": 1, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 20, "priorityTarget": 20, "availableHouse": 62 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 15, 5, 3, 329, -1, 11, 4, 0, 45, 2, 3, 0, 23, 58], [{ "stringID_abbrev": 200, "name": "Troopers", "stringID_full": 201, "wsa": "hyinfy.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 1, "priority": 1 }, "spawnChance": 0, "hitpoints": 110, "fogUncoverRadius": 1, "spriteID": 103, "buildCredits": 200, "buildTime": 56, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 8, "upgradeLevelRequired": 1, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 50, "priorityTarget": 50, "availableHouse": 61 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 15, 10, 3, 341, -1, 11, 4, 0, 50, 5, 5, 0, 23, 59], [{ "stringID_abbrev": 202, "name": "Soldier", "stringID_full": 203, "wsa": "infantry.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 20, "fogUncoverRadius": 1, "spriteID": 102, "buildCredits": 60, "buildTime": 32, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 2, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 10, "priorityTarget": 10, "availableHouse": 62 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 1, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 12, 8, 3, 311, -1, 11, 3, 0, 45, 2, 3, 0, 23, 58], [{ "stringID_abbrev": 204, "name": "Trooper", "stringID_full": 205, "wsa": "hyinfy.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 1, "priority": 1 }, "spawnChance": 0, "hitpoints": 45, "fogUncoverRadius": 1, "spriteID": 88, "buildCredits": 100, "buildTime": 56, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 6, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 20, "priorityTarget": 30, "availableHouse": 61 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 1, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 0, 12, 15, 3, 320, -1, 11, 3, 0, 50, 5, 5, 0, 23, 59], [{ "stringID_abbrev": 44, "name": "Saboteur", "stringID_full": 44, "wsa": "saboture.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 10, "fogUncoverRadius": 1, "spriteID": 96, "buildCredits": 120, "buildTime": 48, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [9, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 700, "availableHouse": 4 }, 20, 21, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 8, 0, 7, 40, 3, 301, -1, 9, 3, 0, 45, 2, 2, 0, 23, 58], [{ "stringID_abbrev": 208, "name": "Launcher", "stringID_full": 209, "wsa": "rtank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 1, "priority": 1 }, "spawnChance": 64, "hitpoints": 100, "fogUncoverRadius": 5, "spriteID": 85, "buildCredits": 450, "buildTime": 72, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 26, "upgradeLevelRequired": 2, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 100, "priorityTarget": 150, "availableHouse": 59 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 30, 1, 111, 146, 11, 1, 162, 120, 9, 75, 3, 19, -1], [{ "stringID_abbrev": 210, "name": "Deviator", "stringID_full": 211, "wsa": "ordrtank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 120, "fogUncoverRadius": 5, "spriteID": 98, "buildCredits": 750, "buildTime": 80, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 30, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 50, "priorityTarget": 175, "availableHouse": 4 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 30, 1, 111, 146, 11, 1, 162, 180, 7, 0, 3, 21, -1], [{ "stringID_abbrev": 212, "name": "Tank", "stringID_full": 213, "wsa": "ltank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 1, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 3, "spriteID": 90, "buildCredits": 300, "buildTime": 64, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 22, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 80, "priorityTarget": 100, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 25, 1, 111, 116, 11, 1, 162, 80, 4, 25, 1, 23, 57], [{ "stringID_abbrev": 214, "name": "Siege Tank", "stringID_full": 215, "wsa": "htank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 1, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 300, "fogUncoverRadius": 4, "spriteID": 84, "buildCredits": 600, "buildTime": 96, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 24, "upgradeLevelRequired": 3, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 130, "priorityTarget": 150, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 1, 0, 20, 1, 121, 126, 11, 1, 162, 90, 5, 30, 1, 23, 57], [{ "stringID_abbrev": 216, "name": "Devastator", "stringID_full": 217, "wsa": "harktank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 400, "fogUncoverRadius": 4, "spriteID": 87, "buildCredits": 800, "buildTime": 104, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 32, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 13, 3], "available": 0, "hintStringID": 0, "priorityBuild": 175, "priorityTarget": 180, "availableHouse": 57 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 1, 0, 10, 1, 131, 136, 11, 1, 165, 100, 5, 40, 1, 23, 57], [{ "stringID_abbrev": 218, "name": "Sonic Tank", "stringID_full": 219, "wsa": "stank.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 110, "fogUncoverRadius": 4, "spriteID": 91, "buildCredits": 600, "buildTime": 104, "availableCampaign": 0, "structuresRequired": 64, "sortPriority": 34, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 80, "priorityTarget": 110, "availableHouse": 58 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 1, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 1, 0, 30, 1, 111, 141, 11, 1, 162, 80, 8, 60, 65535, 24, 43], [{ "stringID_abbrev": 220, "name": "Trike", "stringID_full": 221, "wsa": "trike.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 100, "fogUncoverRadius": 2, "spriteID": 92, "buildCredits": 150, "buildTime": 40, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 10, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 50, "priorityTarget": 50, "availableHouse": 58 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 1, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 3, 0, 45, 2, 243, -1, 11, 1, 0, 50, 3, 5, 0, 23, 59], [{ "stringID_abbrev": 222, "name": "Raider Trike", "stringID_full": 223, "wsa": "otrike.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 80, "fogUncoverRadius": 2, "spriteID": 99, "buildCredits": 150, "buildTime": 40, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 12, "upgradeLevelRequired": 0, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 55, "priorityTarget": 60, "availableHouse": 60 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 1, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 3, 0, 60, 2, 243, -1, 11, 1, 0, 50, 3, 5, 0, 23, 59], [{ "stringID_abbrev": 224, "name": "Quad", "stringID_full": 225, "wsa": "quad.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 130, "fogUncoverRadius": 2, "spriteID": 86, "buildCredits": 200, "buildTime": 48, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 14, "upgradeLevelRequired": 1, "actionsPlayer": [0, 1, 2, 3], "available": 0, "hintStringID": 0, "priorityBuild": 60, "priorityTarget": 60, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 1, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 1, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 16, 3, 0, 40, 2, 238, -1, 11, 1, 0, 50, 3, 7, 0, 23, 59], [{ "stringID_abbrev": 226, "name": "Harvester", "stringID_full": 227, "wsa": "harvest.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 128, "hitpoints": 150, "fogUncoverRadius": 2, "spriteID": 100, "buildCredits": 300, "buildTime": 64, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 18, "upgradeLevelRequired": 0, "actionsPlayer": [5, 1, 6, 7], "available": 0, "hintStringID": 0, "priorityBuild": 10, "priorityTarget": 150, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 2, 0, 20, 1, 248, -1, 5, 1, 165, 0, 0, 0, 65535, 255, 0], [{ "stringID_abbrev": 228, "name": "MCV", "stringID_full": 229, "wsa": "mcv.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 1, "noMessageOnDeath": 0, "tabSelectable": 1, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 1 }, "spawnChance": 64, "hitpoints": 150, "fogUncoverRadius": 2, "spriteID": 101, "buildCredits": 900, "buildTime": 80, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 20, "upgradeLevelRequired": 1, "actionsPlayer": [12, 1, 2, 7], "available": 0, "hintStringID": 0, "priorityBuild": 10, "priorityTarget": 150, "availableHouse": 63 }, 22, 101, { "isBullet": 0, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 1, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 0, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 1 }, 24, 1, 0, 20, 1, 253, -1, 11, 1, 0, 0, 0, 0, 65535, 255, 0], [{ "stringID_abbrev": 0, "name": "Death Hand", "stringID_full": 0, "wsa": "gold-bb.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 1 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 32, 4, 0, 250, 2, 278, -1, 255, 2, 0, 0, 15, 100, 11, 255, 42], [{ "stringID_abbrev": 0, "name": "Rocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 1, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 1, "isNormalUnit": 0 }, 16, 4, 7, 200, 2, 258, -1, 255, 2, 0, 0, 8, 75, 3, 255, 42], [{ "stringID_abbrev": 0, "name": "ARocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 1, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 0, "isNormalUnit": 0 }, 16, 4, 7, 160, 8, 258, -1, 255, 2, 0, 0, 60, 75, 3, 255, 42], [{ "stringID_abbrev": 0, "name": "GRocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 1, "isNormalUnit": 0 }, 16, 4, 7, 200, 2, 258, -1, 255, 2, 0, 0, 7, 75, 7, 255, 42], [{ "stringID_abbrev": 0, "name": "MiniRocket", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 70, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 1, "notAccurate": 0, "isNormalUnit": 0 }, 8, 4, 7, 180, 5, 268, -1, 255, 2, 0, 0, 3, 0, 18, 255, 64], [{ "stringID_abbrev": 0, "name": "Bullet", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 1, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 1, "explodeOnDeath": 1, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 8, 4, 0, 250, 0, 174, -1, 255, 0, 0, 0, 0, 0, 0, 255, -1], [{ "stringID_abbrev": 0, "name": "Sonic Blast", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 1, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 1, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 12, 15, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 32, 4, 7, 200, 0, 160, -1, 255, 0, 0, 0, 10, 25, 65535, 255, -1], [{ "stringID_abbrev": 230, "name": "Sandworm", "stringID_full": 231, "wsa": 0, "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 1, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 1, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 1e3, "fogUncoverRadius": 0, "spriteID": 105, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 8 }, 16, 17, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 1, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 24, 5, 0, 35, 3, 161, -1, 255, 1, 0, 20, 0, 300, 13, 25, 63], [{ "stringID_abbrev": 0, "name": "Frigate", "stringID_full": 0, "wsa": 0, "_4": { "hasShadow": 1, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 1, "tabSelectable": 0, "scriptNoSlowdown": 1, "targetAir": 0, "priority": 1 }, "spawnChance": 0, "hitpoints": 100, "fogUncoverRadius": 0, "spriteID": 0, "buildCredits": 0, "buildTime": 0, "availableCampaign": 0, "structuresRequired": 0, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [7, 7, 7, 7], "available": 0, "hintStringID": 0, "priorityBuild": 0, "priorityTarget": 0, "availableHouse": 63 }, 11, 11, { "isBullet": 0, "explodeOnDeath": 0, "sonicProtection": 0, "canWobble": 0, "isTracked": 0, "isGroundUnit": 0, "mustStayInMap": 0, "firesTwice": 0, "impactOnSand": 0, "isNotDeviatable": 1, "hasAnimationSet": 0, "notAccurate": 0, "isNormalUnit": 0 }, 32, 4, 0, 130, 2, 298, -1, 255, 1, 0, 0, 0, 0, 65535, 255, -1]];
var g_table_structureInfo = [[{ "stringID_abbrev": 232, "name": "Concrete", "stringID_full": 233, "wsa": "slab.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 1, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 20, "fogUncoverRadius": 1, "spriteID": 65, "buildCredits": 5, "buildTime": 16, "availableCampaign": 1, "structuresRequired": 0, "sortPriority": 2, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 341, "priorityBuild": 0, "priorityTarget": 5, "availableHouse": 63 }, 0, 0, 0, 0, 8, [2, 2, 2], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 234, "name": "Concrete4", "stringID_full": 235, "wsa": "4slab.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 1, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 20, "fogUncoverRadius": 1, "spriteID": 83, "buildCredits": 20, "buildTime": 16, "availableCampaign": 4, "structuresRequired": 0, "sortPriority": 4, "upgradeLevelRequired": 1, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 341, "priorityBuild": 0, "priorityTarget": 10, "availableHouse": 63 }, 0, 0, 0, 3, 8, [2, 2, 2], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 236, "name": "Palace", "stringID_full": 237, "wsa": "palace.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 1e3, "fogUncoverRadius": 5, "spriteID": 66, "buildCredits": 999, "buildTime": 130, "availableCampaign": 8, "structuresRequired": 2048, "sortPriority": 5, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 342, "priorityBuild": 0, "priorityTarget": 400, "availableHouse": 63 }, 0, 0, 80, 6, 11, [4, 4, 4], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 238, "name": "Light Fctry", "stringID_full": 239, "wsa": "liteftry.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 350, "fogUncoverRadius": 3, "spriteID": 67, "buildCredits": 400, "buildTime": 96, "availableCampaign": 3, "structuresRequired": 4608, "sortPriority": 14, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 343, "priorityBuild": 0, "priorityTarget": 200, "availableHouse": 63 }, 0, 0, 20, 3, 12, [14, 15, 16], [13, 15, 255, 255, 255, 255, 255, 255], [3, 0, 0]], [{ "stringID_abbrev": 240, "name": "Heavy Fctry", "stringID_full": 241, "wsa": "hvyftry.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 3, "spriteID": 68, "buildCredits": 600, "buildTime": 144, "availableCampaign": 4, "structuresRequired": 262664, "sortPriority": 28, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 344, "priorityBuild": 0, "priorityTarget": 600, "availableHouse": 63 }, 0, 0, 35, 5, 13, [11, 12, 13], [10, 7, 16, 9, 11, 8, 17, 12], [4, 5, 6]], [{ "stringID_abbrev": 242, "name": "Hi-Tech", "stringID_full": 243, "wsa": "hitcftry.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 69, "buildCredits": 500, "buildTime": 120, "availableCampaign": 5, "structuresRequired": 262664, "sortPriority": 30, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 345, "priorityBuild": 0, "priorityTarget": 200, "availableHouse": 63 }, 0, 0, 35, 5, 14, [8, 9, 10], [0, 1, 255, 255, 255, 255, 255, 255], [7, 0, 0]], [{ "stringID_abbrev": 244, "name": "IX", "stringID_full": 245, "wsa": "ix.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 192, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 70, "buildCredits": 500, "buildTime": 120, "availableCampaign": 7, "structuresRequired": 6656, "sortPriority": 34, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 346, "priorityBuild": 0, "priorityTarget": 100, "availableHouse": 63 }, 0, 0, 40, 3, 15, [20, 20, 20], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 246, "name": "WOR", "stringID_full": 247, "wsa": "wor.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 71, "buildCredits": 400, "buildTime": 104, "availableCampaign": 5, "structuresRequired": 263680, "sortPriority": 20, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 347, "priorityBuild": 0, "priorityTarget": 175, "availableHouse": 61 }, 0, 0, 20, 3, 16, [21, 21, 21], [5, 3, 255, 255, 255, 255, 255, 255], [6, 0, 0]], [{ "stringID_abbrev": 248, "name": "Const Yard", "stringID_full": 249, "wsa": "construc.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 1, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 400, "fogUncoverRadius": 3, "spriteID": 72, "buildCredits": 400, "buildTime": 80, "availableCampaign": 99, "structuresRequired": -1, "sortPriority": 0, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 348, "priorityBuild": 0, "priorityTarget": 300, "availableHouse": 63 }, 0, 0, 0, 3, 17, [22, 22, 22], [255, 255, 255, 255, 255, 255, 255, 255], [4, 6, 0]], [{ "stringID_abbrev": 250, "name": "Windtrap", "stringID_full": 251, "wsa": "windtrap.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 2, "spriteID": 73, "buildCredits": 300, "buildTime": 48, "availableCampaign": 1, "structuresRequired": 0, "sortPriority": 6, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 349, "priorityBuild": 0, "priorityTarget": 300, "availableHouse": 63 }, 0, 0, -100, 3, 19, [26, 26, 26], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 252, "name": "Barracks", "stringID_full": 253, "wsa": "barrac.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 300, "fogUncoverRadius": 2, "spriteID": 74, "buildCredits": 300, "buildTime": 72, "availableCampaign": 2, "structuresRequired": 262656, "sortPriority": 18, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 350, "priorityBuild": 0, "priorityTarget": 100, "availableHouse": 62 }, 0, 0, 10, 3, 18, [28, 28, 28], [4, 2, 255, 255, 255, 255, 255, 255], [2, 0, 0]], [{ "stringID_abbrev": 254, "name": "Starport", "stringID_full": 255, "wsa": "starport.wsa", "_4": { "hasShadow": 0, "factory": 1, "notOnConcrete": 0, "busyStateIsIncoming": 1, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 500, "fogUncoverRadius": 6, "spriteID": 75, "buildCredits": 500, "buildTime": 120, "availableCampaign": 6, "structuresRequired": 4608, "sortPriority": 32, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 351, "priorityBuild": 0, "priorityTarget": 250, "availableHouse": 63 }, 0, 0, 50, 6, 20, [5, 6, 7], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 256, "name": "Refinery", "stringID_full": 257, "wsa": "refinery.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 1, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 450, "fogUncoverRadius": 4, "spriteID": 76, "buildCredits": 400, "buildTime": 80, "availableCampaign": 1, "structuresRequired": 512, "sortPriority": 8, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 352, "priorityBuild": 0, "priorityTarget": 300, "availableHouse": 63 }, 65536, 1005, 30, 5, 21, [17, 18, 19], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 258, "name": "Repair", "stringID_full": 259, "wsa": "repair.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 200, "fogUncoverRadius": 3, "spriteID": 77, "buildCredits": 700, "buildTime": 80, "availableCampaign": 5, "structuresRequired": 262664, "sortPriority": 24, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 353, "priorityBuild": 0, "priorityTarget": 600, "availableHouse": 63 }, 130944, 0, 20, 5, 22, [23, 24, 25], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 260, "name": "Wall", "stringID_full": 261, "wsa": "wall.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 50, "fogUncoverRadius": 1, "spriteID": 78, "buildCredits": 50, "buildTime": 40, "availableCampaign": 4, "structuresRequired": 262656, "sortPriority": 16, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 354, "priorityBuild": 0, "priorityTarget": 30, "availableHouse": 63 }, 0, 0, 0, 0, 6, [255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 262, "name": "Turret", "stringID_full": 263, "wsa": "turret.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 2, "spriteID": 79, "buildCredits": 125, "buildTime": 64, "availableCampaign": 5, "structuresRequired": 262656, "sortPriority": 22, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 355, "priorityBuild": 75, "priorityTarget": 150, "availableHouse": 63 }, 0, 0, 10, 0, 23, [255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 264, "name": "R-Turret", "stringID_full": 265, "wsa": "rturret.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 64, "hitpoints": 200, "fogUncoverRadius": 5, "spriteID": 80, "buildCredits": 250, "buildTime": 96, "availableCampaign": 0, "structuresRequired": 262656, "sortPriority": 26, "upgradeLevelRequired": 2, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 356, "priorityBuild": 100, "priorityTarget": 75, "availableHouse": 63 }, 0, 0, 25, 0, 24, [255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 266, "name": "Spice Silo", "stringID_full": 267, "wsa": "storage.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 1, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 0, "hitpoints": 150, "fogUncoverRadius": 2, "spriteID": 81, "buildCredits": 150, "buildTime": 48, "availableCampaign": 2, "structuresRequired": 4608, "sortPriority": 12, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 357, "priorityBuild": 0, "priorityTarget": 150, "availableHouse": 63 }, 0, 1e3, 5, 3, 25, [27, 27, 27], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]], [{ "stringID_abbrev": 268, "name": "Outpost", "stringID_full": 269, "wsa": "headqrts.wsa", "_4": { "hasShadow": 0, "factory": 0, "notOnConcrete": 0, "busyStateIsIncoming": 0, "blurTile": 0, "hasTurret": 0, "conquerable": 0, "canBePickedUp": 0, "noMessageOnDeath": 0, "tabSelectable": 0, "scriptNoSlowdown": 0, "targetAir": 0, "priority": 0 }, "spawnChance": 128, "hitpoints": 500, "fogUncoverRadius": 10, "spriteID": 82, "buildCredits": 400, "buildTime": 80, "availableCampaign": 2, "structuresRequired": 512, "sortPriority": 10, "upgradeLevelRequired": 0, "actionsPlayer": [0, 0, 0, 0], "available": 0, "hintStringID": 358, "priorityBuild": 0, "priorityTarget": 275, "availableHouse": 63 }, 0, 0, 30, 3, 26, [3, 3, 3], [255, 255, 255, 255, 255, 255, 255, 255], [0, 0, 0]]];
var g_table_structure_layoutTiles = { "_0": [0, 0, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x1": [0, 1, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x1": [0, 64, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x2": [0, 1, 64, 65, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x2": [0, 1, 64, 65, 128, 129, 0, 0, 0], "STRUCTURE_LAYOUT_2x3": [0, 1, 2, 64, 65, 66, 0, 0, 0], "STRUCTURE_LAYOUT_3x2": [0, 1, 2, 64, 65, 66, 128, 129, 130] };
var g_table_structure_layoutEdgeTiles = { "_0": [0, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x1": [0, 1, 1, 1, 1, 0, 0, 0], "STRUCTURE_LAYOUT_2x1": [0, 0, 0, 64, 64, 64, 0, 0], "STRUCTURE_LAYOUT_1x2": [0, 1, 1, 65, 65, 64, 64, 0], "STRUCTURE_LAYOUT_2x2": [0, 1, 65, 129, 129, 128, 64, 0], "STRUCTURE_LAYOUT_2x3": [1, 2, 2, 66, 65, 64, 0, 0], "STRUCTURE_LAYOUT_3x2": [1, 2, 66, 130, 129, 128, 64, 0] };
var g_table_structure_layoutTileCount = { "_0": 1, "STRUCTURE_LAYOUT_1x1": 2, "STRUCTURE_LAYOUT_2x1": 2, "STRUCTURE_LAYOUT_1x2": 4, "STRUCTURE_LAYOUT_2x2": 6, "STRUCTURE_LAYOUT_2x3": 6, "STRUCTURE_LAYOUT_3x2": 9 };
var g_table_structure_layoutTileDiff = { "_0": [128, 128], "STRUCTURE_LAYOUT_1x1": [256, 128], "STRUCTURE_LAYOUT_2x1": [128, 256], "STRUCTURE_LAYOUT_1x2": [256, 256], "STRUCTURE_LAYOUT_2x2": [256, 384], "STRUCTURE_LAYOUT_2x3": [640, 256], "STRUCTURE_LAYOUT_3x2": [384, 384] };
var g_table_structure_layoutSize = { "_0": [1, 1], "STRUCTURE_LAYOUT_1x1": [2, 1], "STRUCTURE_LAYOUT_2x1": [1, 2], "STRUCTURE_LAYOUT_1x2": [2, 2], "STRUCTURE_LAYOUT_2x2": [2, 3], "STRUCTURE_LAYOUT_2x3": [3, 2], "STRUCTURE_LAYOUT_3x2": [3, 3] };
var g_table_structure_layoutTilesAround = { "_0": [-64, -63, 1, 65, 64, 63, -1, -65, 0, 0, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x1": [-64, -63, -62, 2, 66, 65, 64, 63, -1, -65, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x1": [-64, -63, 1, 65, 129, 128, 127, 63, -1, -65, 0, 0, 0, 0, 0, 0], "STRUCTURE_LAYOUT_1x2": [-64, -63, -62, 2, 66, 130, 129, 128, 127, 63, -1, -65, 0, 0, 0, 0], "STRUCTURE_LAYOUT_2x2": [-64, -63, -62, 2, 66, 130, 194, 193, 192, 191, 127, 63, -1, -65, 0, 0], "STRUCTURE_LAYOUT_2x3": [-64, -63, -62, -61, 3, 67, 131, 130, 129, 128, 127, 63, -1, -65, 0, 0], "STRUCTURE_LAYOUT_3x2": [-64, -63, -62, -61, 3, 67, 131, 195, 194, 193, 192, 191, 127, 63, -1, -65] };

// web/src/engine/custom-unit-defs.ts
var ORIGINAL_UNIT_COUNT = 27;
var LASER_TANK = 27;
var COMBAT_DRONE = 28;
var DRONE_PAD = 19;
var DRONE_RADIUS = 9 * 256;
var DRONE_RETURN_BATTERY = 20;
var customScriptType = (type) => type === LASER_TANK ? 9 : type === COMBAT_DRONE ? 1 : type;

// web/src/engine/tables.ts
function objectInfo(raw) {
  const o = { ...raw };
  o.flags = raw.flags ?? raw._4;
  delete o._4;
  return o;
}
function unitInfoFrom(raw) {
  const [o, indexStart, indexEnd, flags, dimension, movementType, animationSpeed, movingSpeedFactor, turningSpeed, groundSpriteID, turretSpriteID, actionAI, displayMode, destroyedSpriteID, fireDelay, fireDistance, damage, explosionType, bulletType, bulletSound] = raw;
  return {
    o: objectInfo(o),
    indexStart,
    indexEnd,
    flags,
    dimension,
    movementType,
    animationSpeed,
    movingSpeedFactor,
    turningSpeed,
    groundSpriteID,
    turretSpriteID: turretSpriteID & 65535,
    actionAI,
    displayMode,
    destroyedSpriteID,
    fireDelay,
    fireDistance,
    damage,
    explosionType: explosionType & 65535,
    bulletType: bulletType & 255,
    bulletSound
  };
}
function structureInfoFrom(raw) {
  const [o, enterFilter, creditsStorage, powerUsage, layout, iconGroup, animationIndex, buildableUnits, upgradeCampaign] = raw;
  return { o: objectInfo(o), animations: [null, null, null], enterFilter, creditsStorage, powerUsage, layout, iconGroup, animationIndex, buildableUnits, upgradeCampaign };
}
var arr = (v) => Array.isArray(v) ? v : Object.values(v);
var unitInfo = g_table_unitInfo.map(unitInfoFrom);
var structureInfo = g_table_structureInfo.map(structureInfoFrom);
var landscapeInfo = g_table_landscapeInfo;
var actionInfo = g_table_actionInfo;
var houseInfo = g_table_houseInfo;
var tableMapDiff = g_table_mapDiff;
var tableTileDiff = g_table_tilediff.map((row) => row.map(([x, y]) => ({ x, y })));
var layoutTiles = arr(g_table_structure_layoutTiles);
var layoutTileCount = arr(g_table_structure_layoutTileCount);
var layoutTileDiff = arr(g_table_structure_layoutTileDiff).map(([x, y]) => ({ x, y }));
var layoutSize = arr(g_table_structure_layoutSize).map(([width, height]) => ({ width, height }));
var layoutTilesAround = arr(g_table_structure_layoutTilesAround);
var layoutEdgeTiles = arr(g_table_structure_layoutEdgeTiles);
var explosionTable = g_table_explosion;
var MD = {
  unitInfo: 443836,
  structureInfo: 438190,
  // 19 записей по 0x66 байт
  landscapeInfo: 445622,
  // 15 записей по 0x1c байт
  iconLandscape: 22556,
  // тип ландшафта по номеру иконки (358 байт, FF — нет)
  animationRubble: 437808,
  // g_table_animation_structure[0]
  animationBuild: 437814,
  // g_table_animation_structure[1]
  houseInfo: 444252
  // 6 записей по 30 байт, раскладка как у PC (без имени)
};
var MD_OBJECT_FLAGS = [
  ["hasShadow", 1],
  ["factory", 2],
  ["notOnConcrete", 4],
  ["busyStateIsIncoming", 16],
  ["blurTile", 32],
  ["hasTurret", 64],
  ["conquerable", 128],
  ["canBePickedUp", 256],
  ["noMessageOnDeath", 512],
  ["tabSelectable", 1024],
  ["scriptNoSlowdown", 2048],
  ["targetAir", 4096],
  ["priority", 8192]
];
var MD_UNIT_FLAGS = [
  ["isBullet", 2],
  ["explodeOnDeath", 4],
  ["sonicProtection", 8],
  ["canWobble", 16],
  ["isTracked", 32],
  ["isGroundUnit", 64],
  ["mustStayInMap", 128],
  ["firesTwice", 1024],
  ["impactOnSand", 2048],
  ["isNotDeviatable", 4096],
  ["hasAnimationSet", 8192],
  ["notAccurate", 16384],
  ["isNormalUnit", 32768]
];
var iconLandscape = new Int8Array(512).fill(-1);
var animationStructureRubble = g_table_animation_structure[0];
var animationStructureBuild = g_table_animation_structure[1];
function readAnimation(rom, at) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const w = rom[at + i * 2] << 8 | rom[at + i * 2 + 1];
    const cmd = w >> 12;
    const param = (w & 4095) << 20 >> 20;
    out.push([cmd, param]);
    if (cmd === 0 || cmd === 1 || cmd === 4) break;
  }
  return out;
}
function applyRomTables(rom) {
  const r16 = (o) => rom[o] << 8 | rom[o + 1];
  const s162 = (o) => r16(o) << 16 >> 16;
  const r32 = (o) => (rom[o] << 24 | rom[o + 1] << 16 | rom[o + 2] << 8 | rom[o + 3]) >>> 0;
  const objectFromRom = (oi, p) => {
    const f = r16(p + 12);
    for (const [name, bit] of MD_OBJECT_FLAGS) oi.flags[name] = f & bit ? 1 : 0;
    oi.spawnChance = r16(p + 14);
    oi.hitpoints = r16(p + 16);
    oi.fogUncoverRadius = r16(p + 18);
    oi.buildCredits = r16(p + 22);
    oi.buildTime = r16(p + 24);
    oi.availableCampaign = r16(p + 26);
    oi.structuresRequired = r32(p + 28);
    oi.sortPriority = rom[p + 32];
    oi.upgradeLevelRequired = rom[p + 33];
    oi.actionsPlayer = [r16(p + 34), r16(p + 36), r16(p + 38), r16(p + 40)];
    oi.priorityBuild = r16(p + 46);
    oi.priorityTarget = r16(p + 48);
    oi.availableHouse = rom[p + 50];
  };
  for (let t = 0; t < ORIGINAL_UNIT_COUNT; t++) {
    const p = r32(MD.unitInfo + t * 4);
    const ui = unitInfo[t];
    objectFromRom(ui.o, p);
    ui.indexStart = r16(p + 52);
    ui.indexEnd = r16(p + 54);
    const f = r16(p + 56);
    for (const [name, bit] of MD_UNIT_FLAGS) ui.flags[name] = f & bit ? 1 : 0;
    ui.dimension = r16(p + 58);
    ui.movementType = r16(p + 62);
    ui.animationSpeed = r16(p + 64);
    ui.movingSpeedFactor = r16(p + 66);
    ui.turningSpeed = r16(p + 68) & 255;
    ui.groundSpriteID = r16(p + 70);
    ui.turretSpriteID = r16(p + 72);
    ui.actionAI = r16(p + 74);
    ui.displayMode = r16(p + 76);
    ui.fireDelay = r16(p + 80);
    ui.fireDistance = r16(p + 82);
    ui.damage = r16(p + 84);
    ui.explosionType = r16(p + 86);
    ui.bulletType = r16(p + 88) & 255;
    ui.bulletSound = r16(p + 90);
  }
  for (let t = 0; t < 19; t++) {
    const p = MD.structureInfo + t * 102;
    const si = structureInfo[t];
    objectFromRom(si.o, p);
    si.enterFilter = r32(p + 52);
    si.creditsStorage = r16(p + 56);
    si.powerUsage = s162(p + 58);
    si.layout = r16(p + 60);
    si.iconGroup = r16(p + 62);
    si.animations = [0, 1, 2].map((i) => {
      const a = r32(p + 64 + i * 4);
      return a === 0 ? null : readAnimation(rom, a);
    });
    si.buildableUnits = Array.from({ length: 10 }, (_, i) => r16(p + 76 + i * 2) & 255);
    si.upgradeCampaign = [r16(p + 96), r16(p + 98), r16(p + 100)];
  }
  for (let t = 0; t < landscapeInfo.length; t++) {
    const p = MD.landscapeInfo + t * 28;
    const li = landscapeInfo[t];
    li.movementSpeed = Array.from(rom.subarray(p, p + 6));
    li.letUnitWobble = r16(p + 6) ? 1 : 0;
    li.isValidForStructure = r16(p + 8) ? 1 : 0;
    li.isSand = r16(p + 10) ? 1 : 0;
    li.isValidForStructure2 = r16(p + 12) ? 1 : 0;
    li.canBecomeSpice = r16(p + 14) ? 1 : 0;
    li.craterType = r16(p + 16);
    li.radarColour = r16(p + 18);
  }
  for (let h = 0; h < houseInfo.length; h++) {
    const p = MD.houseInfo + h * 30;
    const hi = houseInfo[h];
    hi.toughness = r16(p + 2);
    hi.degradingChance = r16(p + 4);
    hi.degradingAmount = r16(p + 6) + 1;
    hi.minimapColor = r16(p + 8);
    hi.specialCountDown = r16(p + 10);
    hi.starportDeliveryTime = r16(p + 12);
    hi.specialWeapon = r16(p + 16);
  }
  iconLandscape.fill(-1);
  for (let i = 0; i < 358; i++) iconLandscape[i] = rom[MD.iconLandscape + i] << 24 >> 24;
  animationStructureRubble = readAnimation(rom, MD.animationRubble);
  animationStructureBuild = readAnimation(rom, MD.animationBuild);
  installCustomUnits();
}
function installCustomUnits() {
  const tank = structuredClone(unitInfo[9]);
  Object.assign(tank.o, {
    name: "Laser Tank",
    buildCredits: Math.round(tank.o.buildCredits * 1.6),
    buildTime: Math.round(tank.o.buildTime * 1.45),
    hitpoints: Math.round(tank.o.hitpoints * 0.85),
    availableCampaign: 8,
    upgradeLevelRequired: 1,
    availableHouse: 63,
    structuresRequired: 1 << 5 | 1 << 18,
    sortPriority: 30
  });
  tank.o.flags.targetAir = 1;
  tank.flags.firesTwice = 0;
  tank.flags.notAccurate = 0;
  tank.movingSpeedFactor = Math.round(tank.movingSpeedFactor * 0.8);
  tank.fireDistance = Math.min(6, tank.fireDistance + 1);
  tank.turningSpeed = Math.max(8, tank.turningSpeed * 2);
  tank.damage = Math.round(tank.damage * 3.2);
  tank.fireDelay = 60;
  unitInfo[LASER_TANK] = tank;
  const drone = structuredClone(unitInfo[1]);
  Object.assign(drone.o, {
    name: "Drone Wing",
    buildCredits: 450,
    buildTime: Math.max(25, Math.round(tank.o.buildTime * 0.7)),
    hitpoints: 120,
    availableCampaign: 8,
    upgradeLevelRequired: 0,
    availableHouse: 63,
    structuresRequired: 1 << 18,
    actionsPlayer: [0, 1, 6, 3],
    sortPriority: 31,
    fogUncoverRadius: 3
  });
  Object.assign(drone.o.flags, { hasShadow: 1, canBePickedUp: 0, targetAir: 0, hasTurret: 0, scriptNoSlowdown: 1 });
  Object.assign(drone.flags, { canWobble: 0, isTracked: 0, isGroundUnit: 0, isNotDeviatable: 1, isNormalUnit: 1, explodeOnDeath: 1 });
  Object.assign(drone, { indexStart: 22, indexEnd: 101, fireDistance: 1, damage: 12, fireDelay: 15, turningSpeed: 8 });
  unitInfo[COMBAT_DRONE] = drone;
  structureInfo[4].buildableUnits.push(LASER_TANK);
  const pad = structuredClone(structureInfo[5]);
  Object.assign(pad.o, {
    name: "Drone Control Pad",
    hitpoints: 300,
    buildCredits: 700,
    buildTime: 70,
    availableCampaign: 8,
    structuresRequired: 1 << 5 | 1 << 18,
    upgradeLevelRequired: 0,
    availableHouse: 63,
    sortPriority: 31
  });
  pad.powerUsage = 40;
  pad.buildableUnits = [COMBAT_DRONE];
  pad.upgradeCampaign = [0, 0, 0];
  pad.enterFilter = 0;
  structureInfo[DRONE_PAD] = pad;
}

// web/src/engine/core.ts
var u8 = (v) => v & 255;
var u16 = (v) => v & 65535;
var s8 = (v) => (v & 255) << 24 >> 24;
var s16 = (v) => (v & 65535) << 16 >> 16;
var idiv = (a, b) => Math.trunc(a / b);
var UNIT_INDEX_MAX = 102;
var STRUCTURE_INDEX_MAX_SOFT = 79;
var STRUCTURE_INDEX_MAX_HARD = 82;
var STRUCTURE_INDEX_WALL = 79;
var STRUCTURE_INDEX_SLAB_2x2 = 80;
var STRUCTURE_INDEX_SLAB_1x1 = 81;
var TEAM_INDEX_MAX = 16;
var HOUSE_MAX = 6;
var INDEX_INVALID = 65535;
var HOUSE_INVALID = 255;
var UNIT = {
  CARRYALL: 0,
  ORNITHOPTER: 1,
  INFANTRY: 2,
  TROOPERS: 3,
  SOLDIER: 4,
  TROOPER: 5,
  SABOTEUR: 6,
  LAUNCHER: 7,
  DEVIATOR: 8,
  TANK: 9,
  SIEGE_TANK: 10,
  DEVASTATOR: 11,
  SONIC_TANK: 12,
  TRIKE: 13,
  RAIDER_TRIKE: 14,
  QUAD: 15,
  HARVESTER: 16,
  MCV: 17,
  MISSILE_HOUSE: 18,
  MISSILE_ROCKET: 19,
  MISSILE_TURRET: 20,
  MISSILE_DEVIATOR: 21,
  MISSILE_TROOPER: 22,
  BULLET: 23,
  SONIC_BLAST: 24,
  SANDWORM: 25,
  FRIGATE: 26,
  LASER_TANK: 27,
  COMBAT_DRONE: 28,
  MAX: 29,
  INVALID: 255
};
var STRUCTURE = {
  SLAB_1x1: 0,
  SLAB_2x2: 1,
  PALACE: 2,
  LIGHT_VEHICLE: 3,
  HEAVY_VEHICLE: 4,
  HIGH_TECH: 5,
  HOUSE_OF_IX: 6,
  WOR_TROOPER: 7,
  CONSTRUCTION_YARD: 8,
  WINDTRAP: 9,
  BARRACKS: 10,
  STARPORT: 11,
  REFINERY: 12,
  REPAIR: 13,
  WALL: 14,
  TURRET: 15,
  ROCKET_TURRET: 16,
  SILO: 17,
  OUTPOST: 18,
  DRONE_PAD: 19,
  MAX: 20,
  INVALID: 255
};
var HOUSE = { HARKONNEN: 0, ATREIDES: 1, ORDOS: 2, FREMEN: 3, SARDAUKAR: 4, MERCENARY: 5 };
var ACTION = {
  ATTACK: 0,
  MOVE: 1,
  RETREAT: 2,
  GUARD: 3,
  AREA_GUARD: 4,
  HARVEST: 5,
  RETURN: 6,
  STOP: 7,
  AMBUSH: 8,
  SABOTAGE: 9,
  DIE: 10,
  HUNT: 11,
  DEPLOY: 12,
  DESTRUCT: 13,
  PATROL: 14,
  MAX: 14,
  INVALID: 255
};
var MOVEMENT = { FOOT: 0, TRACKED: 1, HARVESTER: 2, WHEELED: 3, WINGER: 4, SLITHER: 5 };
var LST = {
  NORMAL_SAND: 0,
  PARTIAL_ROCK: 1,
  ENTIRELY_DUNE: 2,
  PARTIAL_DUNE: 3,
  ENTIRELY_ROCK: 4,
  MOSTLY_ROCK: 5,
  ENTIRELY_MOUNTAIN: 6,
  PARTIAL_MOUNTAIN: 7,
  SPICE: 8,
  THICK_SPICE: 9,
  CONCRETE_SLAB: 10,
  WALL: 11,
  STRUCTURE: 12,
  DESTROYED_WALL: 13,
  BLOOM_FIELD: 14
};
var STATE = { DETECT: -2, JUSTBUILT: -1, IDLE: 0, BUSY: 1, READY: 2 };
var EXPLOSION = {
  IMPACT_SMALL: 0,
  IMPACT_MEDIUM: 1,
  IMPACT_LARGE: 2,
  IMPACT_EXPLODE: 3,
  SABOTEUR_DEATH: 4,
  SABOTEUR_INFILTRATE: 5,
  TANK_EXPLODE: 6,
  DEVIATOR_GAS: 7,
  SAND_BURST: 8,
  TANK_FLAMES: 9,
  WHEELED_VEHICLE: 10,
  DEATH_HAND: 11,
  UNUSED_12: 12,
  SANDWORM_SWALLOW: 13,
  STRUCTURE: 14,
  SMOKE_PLUME: 15,
  ORNITHOPTER_CRASH: 16,
  CARRYALL_CRASH: 17,
  MINI_ROCKET: 18,
  SPICE_BLOOM_TREMOR: 19,
  INVALID: 65535
};
var TEAM_ACTION = { NORMAL: 0, STAGING: 1, FLEE: 2, KAMIKAZE: 3, GUARD: 4, MAX: 5, INVALID: 255 };
var SELECTION = { MENTAT: 0, TARGET: 1, PLACE: 2, UNIT: 3, STRUCTURE: 4, DEBUG: 5 };
var HOUSE_WEAPON = { MISSILE: 1, FREMEN: 2, SABOTEUR: 3 };
function newFlags() {
  return {
    used: false,
    allocated: false,
    isNotOnMap: false,
    isSmoking: false,
    fireTwiceFlip: false,
    animationFlip: false,
    bulletIsBig: false,
    isWobbling: false,
    inTransport: false,
    byScenario: false,
    degrades: false,
    isHighlighted: false,
    isDirty: false,
    repairing: false,
    onHold: false,
    isUnit: false,
    upgrading: false
  };
}
function newScript() {
  return { delay: 0, pc: -1, scriptInfo: null, returnValue: 0, framePointer: 2, stackPointer: 15, variables: [0, 0, 0, 0, 0], stack: new Array(15).fill(0), isSubroutine: 0 };
}
function newObject() {
  return { index: 0, type: 0, linkedID: 255, flags: newFlags(), houseID: 0, seenByHouses: 0, position: { x: 0, y: 0 }, hitpoints: 0, script: newScript() };
}
function newUnit() {
  return {
    o: newObject(),
    currentDestination: { x: 0, y: 0 },
    originEncoded: 0,
    repairTime: 0,
    actionID: 0,
    nextActionID: 0,
    fireDelay: 0,
    distanceToDestination: 0,
    targetAttack: 0,
    targetMove: 0,
    amount: 0,
    deviated: 0,
    deviatedHouse: 0,
    targetLast: { x: 0, y: 0 },
    targetPreLast: { x: 0, y: 0 },
    orientation: [{ speed: 0, target: 0, current: 0 }, { speed: 0, target: 0, current: 0 }],
    speedPerTick: 0,
    speedRemainder: 0,
    speed: 0,
    movingSpeed: 0,
    wobbleIndex: 0,
    spriteOffset: 0,
    blinkCounter: 0,
    recoil: false,
    recoilShown: false,
    team: 0,
    timer: 0,
    route: new Array(14).fill(0),
    patrolActive: false,
    patrolStart: { x: 0, y: 0 },
    patrolEnd: { x: 0, y: 0 },
    patrolToEnd: true,
    patrolEngaging: false
  };
}
function newStructure() {
  return { o: newObject(), creatorHouseID: 0, rotationSpriteDiff: 0, objectType: 0, upgradeLevel: 0, upgradeTimeLeft: 0, countDown: 0, buildCostRemainder: 0, state: 0, hitpointsMax: 0, specialWait: 0, spent: 0 };
}
function newHouse() {
  return {
    index: 0,
    harvestersIncoming: 0,
    flags: { used: false, human: false, doneFullScaleAttack: false, isAIActive: false, radarActivated: false },
    unitCount: 0,
    unitCountMax: 0,
    unitCountEnemy: 0,
    unitCountAllied: 0,
    structuresBuilt: 0,
    credits: 0,
    creditsStorage: 0,
    powerProduction: 0,
    powerUsage: 0,
    windtrapCount: 0,
    creditsQuota: 0,
    palacePosition: { x: 0, y: 0 },
    timerUnitAttack: 0,
    timerSandwormAttack: 0,
    timerStructureAttack: 0,
    starportTimeLeft: 0,
    starportLinkedID: INDEX_INVALID,
    ai_structureRebuild: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]
  };
}
function newTeam() {
  return { index: 0, flags: { used: false }, members: 0, minMembers: 0, maxMembers: 0, movementType: 0, action: 0, actionStart: 0, houseID: 0, position: { x: 0, y: 0 }, targetTile: 0, target: 0, script: newScript() };
}
function newTile() {
  return { groundTileID: 0, overlayTileID: 0, houseID: 0, isUnveiled: false, hasUnit: false, hasStructure: false, hasAnimation: false, hasExplosion: false, index: 0 };
}
var MAP_INFOS = [
  { minX: 1, minY: 1, sizeX: 62, sizeY: 62 },
  { minX: 16, minY: 16, sizeX: 32, sizeY: 32 },
  { minX: 21, minY: 21, sizeX: 21, sizeY: 21 }
];
var G = {
  droneGrenades: [],
  map: Array.from({ length: 4096 }, newTile),
  mapTileID: new Uint16Array(4096),
  units: Array.from({ length: UNIT_INDEX_MAX }, newUnit),
  unitFind: [],
  structures: Array.from({ length: STRUCTURE_INDEX_MAX_HARD }, newStructure),
  structureFind: [],
  houses: Array.from({ length: HOUSE_MAX }, newHouse),
  houseFind: [],
  teams: Array.from({ length: TEAM_INDEX_MAX }, newTeam),
  teamFind: [],
  timerGame: 0,
  playerHouseID: 1,
  mapScale: 0,
  campaignID: 1,
  scenarioID: 1,
  validateStrictIfZero: 0,
  gameSpeed: 2,
  /** 0 — easy, 1 — normal, 2 — hard; set from the front-end before loading a campaign mission. */
  difficulty: 1,
  /** особые иконки (sprites.c) */
  veiledTileID: 0,
  bloomTileID: 0,
  builtSlabTileID: 0,
  landscapeTileID: 0,
  wallTileID: 0,
  /** группы иконок: g_iconMap[g_iconMap[group] + i] */
  iconGroups: [],
  unitSelected: null,
  structureActiveType: 65535,
  houseMissileCountdown: 0,
  unitHouseMissile: null,
  /** верхний левый угол видимой области, клетка (для проверок «в окне») */
  viewportPacked: 0,
  viewportTilesW: 15,
  viewportTilesH: 10,
  scriptCurrentObject: null,
  scriptCurrentUnit: null,
  scriptCurrentStructure: null,
  scriptCurrentTeam: null,
  starportAvailable: new Array(27).fill(0),
  /** скрипты EMC из ROM */
  scriptUnit: null,
  scriptStructure: null,
  scriptTeam: null,
  /** MD: тип ландшафта по номеру иконки ($00581C), −1 — не ландшафт */
  iconLandscape: new Int8Array(512).fill(-1),
  timerGUI: 0,
  tickScenarioStart: 0,
  selectionType: SELECTION.STRUCTURE,
  playerCredits: 65535,
  playerCreditsNoSilo: 0,
  tickHousePowerMaintenance: 0,
  structureIndex: 0,
  unitActive: null,
  activeAction: 65535,
  structureActive: null,
  structureActivePosition: 0,
  factoryWindowConstructionYard: false,
  musicInBattle: 0,
  /** код PLAYTESTER: юниты игрока гибнут только в пасти червя */
  playtester: false,
  infiniteSpice: false,
  /** код LOOKAROUND: туман не рисуется (в оригинале переключатель $FFC198 бит 0) */
  revealAll: false,
  scenario: newScenario(),
  /** звуки и сообщения уходят в интерфейс через эти обработчики */
  onSound: (_id, _pos) => {
  },
  /** Render notifications only; handlers must not change simulation state or consume RNG. */
  onUnitShot: (_unit, _bullet) => {
  },
  onVisualExplosion: (_type, _position) => {
  },
  onConstructionStart: () => {
  },
  onConstructionComplete: () => {
  },
  onFeedback: (_id) => {
  },
  onMessage: (_text, _priority = 0) => {
  },
  onSelect: () => {
  }
};
function newScenario() {
  return {
    winFlags: 0,
    loseFlags: 0,
    timeOut: 0,
    mapScale: 0,
    score: 0,
    killedAllied: 0,
    killedEnemy: 0,
    destroyedAllied: 0,
    destroyedEnemy: 0,
    harvestedAllied: 0,
    harvestedEnemy: 0,
    reinforcement: Array.from({ length: 16 }, () => ({ unitID: INDEX_INVALID, locationID: 0, timeLeft: 0, timeBetween: 0, repeat: 0 }))
  };
}
var seed = [0, 0, 0, 0];
var lcg = 0;
function randomSeed(v) {
  seed[0] = v & 255;
  seed[1] = v >>> 8 & 255;
  seed[2] = v >>> 16 & 255;
  seed[3] = v >>> 24 & 255;
}
function random256() {
  let val16 = seed[1] << 8 | seed[2];
  let val8 = (val16 ^ 32768) >> 15 & 1;
  val16 = u16(val16 << 1 | seed[0] >> 1 & 1);
  val8 = u8((seed[0] >> 2) - seed[0] - val8);
  seed[0] = u8(val8 << 7 | seed[0] >> 1);
  seed[1] = val16 >> 8;
  seed[2] = val16 & 255;
  return seed[0] ^ seed[1];
}
function randomLCGSeed(v) {
  lcg = v >>> 0;
}
function randomLCG() {
  lcg = Math.imul(22695477, lcg) + 1 >>> 0;
  return lcg >>> 16 & 32767;
}
function randomRange(min, max) {
  if (min > max) [min, max] = [max, min];
  let ret;
  do {
    ret = u16(idiv(randomLCG() * (max - min + 1), 32768) + min);
  } while (ret > max);
  return ret;
}
function adjustToGameSpeed(normal, minimum, maximum, inverseSpeed) {
  let gameSpeed = G.gameSpeed;
  if (gameSpeed === 2) return normal;
  if (gameSpeed > 4) return normal;
  if (maximum > normal * 2) maximum = normal * 2;
  if (minimum < idiv(normal, 2)) minimum = idiv(normal, 2);
  if (inverseSpeed) gameSpeed = 4 - gameSpeed;
  switch (gameSpeed) {
    case 0:
      return minimum;
    case 1:
      return normal - idiv(normal - minimum, 2);
    case 3:
      return normal + idiv(maximum - normal, 2);
    case 4:
      return maximum;
  }
  return normal;
}
var packXY = (x, y) => u16(y << 6 | x);
var packedX = (p) => p & 63;
var packedY = (p) => p >> 6 & 63;
var posX = (t) => t.x >> 8 & 63;
var posY = (t) => t.y >> 8 & 63;
var packTile = (t) => posY(t) << 6 | posX(t);
var isOutOfMap = (p) => (p & 61440) !== 0;
var tileIsValid = (t) => ((t.x | t.y) & 49152) === 0;
var tile = (x, y) => ({ x: u16(x), y: u16(y) });
function unpackTile(packed) {
  return { x: (packed >> 0 & 63) << 8 | 128, y: (packed >> 6 & 63) << 8 | 128 };
}
function tileGetDistance(from, to) {
  const dx = u16(Math.abs(from.x - to.x));
  const dy = u16(Math.abs(from.y - to.y));
  if (dx > dy) return u16(dx + (dy >> 1));
  return u16(dy + (dx >> 1));
}
var tileAddDiff = (a, d) => tile(a.x + d.x, a.y + d.y);
var tileCenter = (t) => ({ x: t.x & 65280 | 128, y: t.y & 65280 | 128 });
var tileGetDistancePacked = (a, b) => tileGetDistance(unpackTile(a), unpackTile(b)) >> 8;
var tileGetDistanceRoundedUp = (a, b) => tileGetDistance(a, b) + 128 >> 8;
function tileGetDirectionPacked(from, to) {
  const ret = [32, 64, 32, 0, 224, 192, 224, 0, 96, 64, 96, 128, 160, 192, 160, 128];
  const x1 = packedX(from);
  const y1 = packedY(from);
  const x2 = packedX(to);
  const y2 = packedY(to);
  let index = 0;
  let dy = y1 - y2;
  if (dy < 0) {
    index |= 8;
    dy = -dy;
  }
  let dx = x2 - x1;
  if (dx < 0) {
    index |= 4;
    dx = -dx;
  }
  if (dx >= dy) {
    if (idiv(dx + 1, 2) > dy) index |= 1;
  } else {
    index |= 2;
    if (idiv(dy + 1, 2) > dx) index |= 1;
  }
  return ret[index];
}
var STEP_X = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 59, 62, 65, 67, 70, 73, 75, 78, 80, 82, 85, 87, 89, 91, 94, 96, 98, 100, 101, 103, 105, 107, 108, 110, 111, 113, 114, 116, 117, 118, 119, 120, 121, 122, 123, 123, 124, 125, 125, 126, 126, 126, 126, 126, 127, 126, 126, 126, 126, 126, 125, 125, 124, 123, 123, 122, 121, 120, 119, 118, 117, 116, 114, 113, 112, 110, 108, 107, 105, 103, 102, 100, 98, 96, 94, 91, 89, 87, 85, 82, 80, 78, 75, 73, 70, 67, 65, 62, 59, 57, 54, 51, 48, 45, 42, 39, 36, 33, 30, 27, 24, 21, 18, 15, 12, 9, 6, 3, 0, -3, -6, -9, -12, -15, -18, -21, -24, -27, -30, -33, -36, -39, -42, -45, -48, -51, -54, -57, -59, -62, -65, -67, -70, -73, -75, -78, -80, -82, -85, -87, -89, -91, -94, -96, -98, -100, -102, -103, -105, -107, -108, -110, -111, -113, -114, -116, -117, -118, -119, -120, -121, -122, -123, -123, -124, -125, -125, -126, -126, -126, -126, -126, -126, -126, -126, -126, -126, -126, -125, -125, -124, -123, -123, -122, -121, -120, -119, -118, -117, -116, -114, -113, -112, -110, -108, -107, -105, -103, -102, -100, -98, -96, -94, -91, -89, -87, -85, -82, -80, -78, -75, -73, -70, -67, -65, -62, -59, -57, -54, -51, -48, -45, -42, -39, -36, -33, -30, -27, -24, -21, -18, -15, -12, -9, -6, -3];
var STEP_Y = [127, 126, 126, 126, 126, 126, 125, 125, 124, 123, 123, 122, 121, 120, 119, 118, 117, 116, 114, 113, 112, 110, 108, 107, 105, 103, 102, 100, 98, 96, 94, 91, 89, 87, 85, 82, 80, 78, 75, 73, 70, 67, 65, 62, 59, 57, 54, 51, 48, 45, 42, 39, 36, 33, 30, 27, 24, 21, 18, 15, 12, 9, 6, 3, 0, -3, -6, -9, -12, -15, -18, -21, -24, -27, -30, -33, -36, -39, -42, -45, -48, -51, -54, -57, -59, -62, -65, -67, -70, -73, -75, -78, -80, -82, -85, -87, -89, -91, -94, -96, -98, -100, -102, -103, -105, -107, -108, -110, -111, -113, -114, -116, -117, -118, -119, -120, -121, -122, -123, -123, -124, -125, -125, -126, -126, -126, -126, -126, -126, -126, -126, -126, -126, -126, -125, -125, -124, -123, -123, -122, -121, -120, -119, -118, -117, -116, -114, -113, -112, -110, -108, -107, -105, -103, -102, -100, -98, -96, -94, -91, -89, -87, -85, -82, -80, -78, -75, -73, -70, -67, -65, -62, -59, -57, -54, -51, -48, -45, -42, -39, -36, -33, -30, -27, -24, -21, -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 59, 62, 65, 67, 70, 73, 75, 78, 80, 82, 85, 87, 89, 91, 94, 96, 98, 100, 101, 103, 105, 107, 108, 110, 111, 113, 114, 116, 117, 118, 119, 120, 121, 122, 123, 123, 124, 125, 125, 126, 126, 126, 126, 126];
function tileMoveByDirection(t, orientation, distance2) {
  distance2 = Math.min(u16(distance2), 255);
  if (distance2 === 0) return { ...t };
  const dx = STEP_X[orientation & 255];
  const dy = STEP_Y[orientation & 255];
  const rx = dx < 0 ? -64 : 64;
  const ry = dy < 0 ? -64 : 64;
  return tile(t.x + idiv(dx * distance2 + rx, 128), t.y - idiv(dy * distance2 + ry, 128));
}
function tileMoveByRandom(t, distance2, center2) {
  if (distance2 === 0) return { ...t };
  let x = t.x;
  let y = t.y;
  let nd = random256();
  while (nd > distance2) nd = nd >> 1;
  distance2 = nd;
  const orientation = random256();
  x = u16(x + idiv(STEP_X[orientation] * distance2, 128) * 16);
  y = u16(y - idiv(STEP_Y[orientation] * distance2, 128) * 16);
  if (x > 16384 || y > 16384) return { ...t };
  const ret = { x, y };
  return center2 ? tileCenter(ret) : ret;
}
function tileGetDirection(from, to) {
  const orientationOffsets = [64, 128, 0, 192];
  const directions = [16383, 10428, 5210, 3470, 2599, 2075, 1725, 1475, 1286, 1140, 1022, 925, 843, 774, 715, 663, 618, 577, 541, 508, 478, 451, 427, 404, 383, 363, 345, 328, 311, 296, 282, 268];
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  let quadrant = 0;
  if (Math.abs(dx) + Math.abs(dy) > 8e3) {
    dx = idiv(dx, 2);
    dy = idiv(dy, 2);
  }
  if (dy <= 0) {
    quadrant |= 2;
    dy = -dy;
  }
  if (dx < 0) {
    quadrant |= 1;
    dx = -dx;
  }
  const base = orientationOffsets[quadrant];
  let invert = false;
  let gradient = 32767;
  if (dx >= dy) {
    if (dy !== 0) gradient = idiv(dx << 8, dy);
  } else {
    invert = true;
    if (dx !== 0) gradient = idiv(dy << 8, dx);
  }
  let i = 0;
  for (; i < directions.length; i++) if (directions[i] <= gradient) break;
  if (!invert) i = 64 - i;
  if (quadrant === 0 || quadrant === 3) return s8(base + 64 - i & 255);
  return s8(base + i & 255);
}
var orientation8 = (o) => (o & 255) + 16 >> 5 & 7;
var orientation16 = (o) => (o & 255) + 8 >> 4 & 15;
function tileMoveByOrientation(position, orientation) {
  const xo = [0, 256, 256, 256, 0, -256, -256, -256];
  const yo = [-256, -256, 0, 256, 256, 256, 0, -256];
  const o = orientation8(orientation);
  const x = u16(position.x + xo[o]);
  const y = u16(position.y + yo[o]);
  if (x > 16384 || y > 16384) return { ...position };
  return { x, y };
}
var findAll = (houseID = HOUSE_INVALID, type = 65535) => ({ houseID, type, index: 65535 });
function unitFind(f, getHouse) {
  if (f.index >= G.unitFind.length && f.index !== 65535) return null;
  f.index = u16(f.index + 1);
  for (; f.index < G.unitFind.length; f.index++) {
    const u = G.unitFind[f.index];
    if (u.o.flags.isNotOnMap && G.validateStrictIfZero === 0) continue;
    if (f.houseID !== HOUSE_INVALID && f.houseID !== getHouse(u)) continue;
    if (f.type !== 65535 && f.type !== u.o.type) continue;
    return u;
  }
  return null;
}
function structureFind(f) {
  const n = G.structureFind.length;
  if (f.index >= n + 3 && f.index !== 65535) return null;
  f.index = u16(f.index + 1);
  for (; f.index < n + 3; f.index++) {
    let s;
    if (f.index < n) {
      s = G.structureFind[f.index];
    } else {
      const special = [STRUCTURE_INDEX_WALL, STRUCTURE_INDEX_SLAB_2x2, STRUCTURE_INDEX_SLAB_1x1][f.index - n];
      s = G.structures[special];
      if (s.o.index !== special) continue;
    }
    if (s.o.flags.isNotOnMap && G.validateStrictIfZero === 0) continue;
    if (f.houseID !== HOUSE_INVALID && f.houseID !== s.o.houseID) continue;
    if (f.type !== 65535 && f.type !== s.o.type) continue;
    return s;
  }
  return null;
}
function houseFind(f) {
  if (f.index >= G.houseFind.length && f.index !== 65535) return null;
  f.index = u16(f.index + 1);
  for (; f.index < G.houseFind.length; f.index++) return G.houseFind[f.index];
  return null;
}
function teamFind(f) {
  if (f.index >= G.teamFind.length && f.index !== 65535) return null;
  f.index = u16(f.index + 1);
  for (; f.index < G.teamFind.length; f.index++) {
    const t = G.teamFind[f.index];
    if (f.houseID === HOUSE_INVALID || f.houseID === t.houseID) return t;
  }
  return null;
}
function resetUnit(u) {
  const n = newUnit();
  Object.assign(u.o, n.o);
  const { o: _o, ...rest } = n;
  Object.assign(u, rest);
}
function resetStructure(s) {
  s.unitQueue = [];
  s.prepaidUnitCost = void 0;
  const n = newStructure();
  Object.assign(s.o, n.o);
  const { o: _o, ...rest } = n;
  Object.assign(s, rest);
}
function poolsReset() {
  G.units.forEach(resetUnit);
  G.unitFind.length = 0;
  G.structures.forEach(resetStructure);
  G.structureFind.length = 0;
  G.houses.forEach((h) => Object.assign(h, newHouse()));
  G.houseFind.length = 0;
  G.teams.forEach((t) => Object.assign(t, newTeam()));
  G.teamFind.length = 0;
  G.map.forEach((t) => Object.assign(t, newTile()));
  G.mapTileID.fill(0);
}
function houseAllocate(index) {
  if (index >= HOUSE_MAX) return null;
  const h = G.houses[index];
  if (h.flags.used) return null;
  Object.assign(h, newHouse());
  h.index = index;
  h.flags.used = true;
  G.houseFind.push(h);
  return h;
}
function teamAllocate(index) {
  if (index === INDEX_INVALID) {
    for (index = 0; index < TEAM_INDEX_MAX; index++) if (!G.teams[index].flags.used) break;
    if (index === TEAM_INDEX_MAX) return null;
  } else if (G.teams[index].flags.used) return null;
  const t = G.teams[index];
  Object.assign(t, newTeam());
  t.index = index;
  t.flags.used = true;
  G.teamFind.push(t);
  return t;
}
function structureAllocate(index, type) {
  if (type === STRUCTURE.SLAB_1x1) index = STRUCTURE_INDEX_SLAB_1x1;
  else if (type === STRUCTURE.SLAB_2x2) index = STRUCTURE_INDEX_SLAB_2x2;
  else if (type === STRUCTURE.WALL) index = STRUCTURE_INDEX_WALL;
  else {
    if (index === INDEX_INVALID) {
      for (index = 0; index < STRUCTURE_INDEX_MAX_SOFT; index++) if (!G.structures[index].o.flags.used) break;
      if (index === STRUCTURE_INDEX_MAX_SOFT) return null;
    } else if (G.structures[index].o.flags.used) return null;
  }
  const s = G.structures[index];
  resetStructure(s);
  s.o.index = index;
  s.o.type = type;
  s.o.linkedID = 255;
  s.o.flags.used = true;
  s.o.flags.allocated = true;
  s.o.script.delay = 0;
  if (index < STRUCTURE_INDEX_MAX_SOFT) G.structureFind.push(s);
  return s;
}
function structureFree(s) {
  if (s.unitQueue?.length) {
    G.houses[s.o.houseID].credits += s.unitQueue.reduce((sum, item) => sum + item.cost, 0);
    s.unitQueue = [];
  }
  s.prepaidUnitCost = void 0;
  s.o.flags = newFlags();
  s.o.script.pc = -1;
  if (s.o.type === STRUCTURE.SLAB_1x1 || s.o.type === STRUCTURE.SLAB_2x2 || s.o.type === STRUCTURE.WALL) return;
  const i = G.structureFind.indexOf(s);
  if (i >= 0) G.structureFind.splice(i, 1);
}
function unitAllocate(index, type, houseID) {
  if (type === 255 || houseID === 255) return null;
  const h = G.houses[houseID];
  if (h.unitCount >= h.unitCountMax) {
    const mt = unitInfo[type].movementType;
    if ((mt !== MOVEMENT.WINGER && mt !== MOVEMENT.SLITHER || type === UNIT.COMBAT_DRONE) && G.validateStrictIfZero === 0) return null;
  }
  let u;
  if (index === 0 || index === INDEX_INVALID) {
    const { indexStart, indexEnd } = unitInfo[type];
    for (index = indexStart; index <= indexEnd; index++) if (!G.units[index].o.flags.used) break;
    if (index > indexEnd) return null;
    u = G.units[index];
  } else {
    u = G.units[index];
    if (u.o.flags.used) return null;
  }
  h.unitCount++;
  resetUnit(u);
  u.o.index = index;
  u.o.type = type;
  u.o.houseID = houseID;
  u.o.linkedID = 255;
  u.o.flags.used = true;
  u.o.flags.allocated = true;
  u.o.flags.isUnit = true;
  u.o.script.delay = 0;
  u.route[0] = 255;
  if (type === UNIT.SANDWORM) u.amount = 3;
  G.unitFind.push(u);
  return u;
}
function unitFree(u) {
  u.o.flags = newFlags();
  u.o.script.pc = -1;
  const i = G.unitFind.indexOf(u);
  if (i < 0) return;
  G.unitFind.splice(i, 1);
  G.houses[u.o.houseID].unitCount--;
}
function indexGetType(encoded) {
  switch (encoded & 49152) {
    case 16384:
      return 2 /* UNIT */;
    case 32768:
      return 3 /* STRUCTURE */;
    case 49152:
      return 1 /* TILE */;
    default:
      return 0 /* NONE */;
  }
}
function indexDecode(encoded) {
  if (indexGetType(encoded) === 1 /* TILE */) return packXY(encoded >> 1 & 63, encoded >> 8 & 63);
  return encoded & 16383;
}
function indexEncode(index, type) {
  switch (type) {
    case 1 /* TILE */: {
      let ret = (packedX(index) << 1) + 1 << 0;
      ret |= (packedY(index) << 1) + 1 << 7;
      return u16(ret | 49152);
    }
    case 2 /* UNIT */:
      if (index >= UNIT_INDEX_MAX || !G.units[index].o.flags.allocated) return 0;
      return index | 16384;
    case 3 /* STRUCTURE */:
      return index | 32768;
    default:
      return 0;
  }
}
function indexIsValid(encoded) {
  if (encoded === 0) return false;
  const index = indexDecode(encoded);
  switch (indexGetType(encoded)) {
    case 2 /* UNIT */:
      if (index >= UNIT_INDEX_MAX) return false;
      return G.units[index].o.flags.used && G.units[index].o.flags.allocated;
    case 3 /* STRUCTURE */:
      if (index >= STRUCTURE_INDEX_MAX_HARD) return false;
      return G.structures[index].o.flags.used;
    case 1 /* TILE */:
      return true;
    default:
      return false;
  }
}
function indexGetUnit(encoded) {
  if (indexGetType(encoded) !== 2 /* UNIT */) return null;
  const i = indexDecode(encoded);
  return i < UNIT_INDEX_MAX ? G.units[i] : null;
}
function indexGetStructure(encoded) {
  if (indexGetType(encoded) !== 3 /* STRUCTURE */) return null;
  const i = indexDecode(encoded);
  return i < STRUCTURE_INDEX_MAX_HARD ? G.structures[i] : null;
}
function indexGetObject(encoded) {
  switch (indexGetType(encoded)) {
    case 2 /* UNIT */: {
      const i = indexDecode(encoded);
      return i < UNIT_INDEX_MAX ? G.units[i].o : null;
    }
    case 3 /* STRUCTURE */: {
      const i = indexDecode(encoded);
      return i < STRUCTURE_INDEX_MAX_HARD ? G.structures[i].o : null;
    }
    default:
      return null;
  }
}
function indexGetPackedTile(encoded) {
  const index = indexDecode(encoded);
  switch (indexGetType(encoded)) {
    case 1 /* TILE */:
      return index;
    case 2 /* UNIT */:
      return index < UNIT_INDEX_MAX ? packTile(G.units[index].o.position) : 0;
    case 3 /* STRUCTURE */:
      return index < STRUCTURE_INDEX_MAX_HARD ? packTile(G.structures[index].o.position) : 0;
    default:
      return 0;
  }
}
function indexGetTile(encoded) {
  const index = indexDecode(encoded);
  switch (indexGetType(encoded)) {
    case 1 /* TILE */:
      return unpackTile(index);
    case 2 /* UNIT */:
      return index < UNIT_INDEX_MAX ? { ...G.units[index].o.position } : { x: 0, y: 0 };
    case 3 /* STRUCTURE */: {
      if (index >= STRUCTURE_INDEX_MAX_HARD) return { x: 0, y: 0 };
      const s = G.structures[index];
      return tileAddDiff(s.o.position, layoutTileDiff[structureInfo[s.o.type].layout]);
    }
    default:
      return { x: 0, y: 0 };
  }
}

// web/src/engine/explosion.ts
var EXPLOSION_MAX = 32;
var explosions = Array.from({ length: EXPLOSION_MAX }, () => ({ timeOut: 0, houseID: 0, current: 0, spriteID: 0, commands: null, position: { x: 0, y: 0 }, type: 0 }));
var explosionTimer = 0;
function explosionInit() {
  for (const e of explosions) e.commands = null;
  explosionTimer = 0;
}
var CRATER_GROUP = [-1, 2, 1];
function funcTileDamage(e) {
  const packed = packTile(e.position);
  if (!mapIsPositionUnveiled(packed)) return;
  const type = mapGetLandscapeType(packed);
  if (type === LST.STRUCTURE || type === LST.DESTROYED_WALL) return;
  const t = G.map[packed];
  if (type === LST.CONCRETE_SLAB) t.groundTileID = G.mapTileID[packed] & 511;
  const crater = landscapeInfo[type].craterType;
  if (crater === 0) return;
  let overlayTileID = t.overlayTileID;
  if (!tileIsUnveiled(overlayTileID)) return;
  const iconMap = G.iconGroups[CRATER_GROUP[crater]];
  if (!iconMap || iconMap.length === 0) return;
  if (iconMap[0] <= overlayTileID && overlayTileID < iconMap[0] + iconMap.length) {
    overlayTileID -= iconMap[0];
    if (overlayTileID < iconMap.length - 2) overlayTileID += 2;
  } else {
    overlayTileID = random256() & 1;
  }
  mapChangeSpiceAmount(packed, -1);
  if (t.groundTileID === G.bloomTileID) {
    mapBloomExplodeSpice(packed, G.playerHouseID);
    return;
  }
  t.overlayTileID = overlayTileID + iconMap[0] & 127;
}
function funcStop(e) {
  G.map[packTile(e.position)].hasExplosion = false;
  e.commands = null;
}
function stopAtPosition(packed) {
  const t = G.map[packed];
  if (!t.hasExplosion) return;
  for (const e of explosions) {
    if (e.commands === null || packTile(e.position) !== packed) continue;
    funcStop(e);
  }
}
function explosionStart(explosionType, position) {
  if (explosionType > 19) return;
  const commands = explosionTable[explosionType];
  const packed = packTile(position);
  stopAtPosition(packed);
  for (const e of explosions) {
    if (e.commands !== null) continue;
    e.commands = commands;
    e.current = 0;
    e.spriteID = 0;
    e.position = { ...position };
    e.timeOut = G.timerGUI;
    e.type = explosionType;
    explosionTimer = 0;
    G.map[packed].hasExplosion = true;
    G.onVisualExplosion(explosionType, position);
    break;
  }
}
var onScreenShake = () => {
};
function explosionTick() {
  if (explosionTimer > G.timerGUI) return;
  explosionTimer += 1e4;
  for (const e of explosions) {
    if (e.commands === null) continue;
    if (e.timeOut <= G.timerGUI) {
      const [command, parameter] = e.commands[e.current] ?? [0 /* STOP */, 0];
      e.current++;
      switch (command) {
        case 1 /* SET_SPRITE */:
          e.spriteID = parameter;
          break;
        case 2 /* SET_TIMEOUT */:
          e.timeOut = G.timerGUI + parameter;
          break;
        case 3 /* SET_RANDOM_TIMEOUT */:
          e.timeOut = G.timerGUI + randomRange(0, parameter);
          break;
        case 4 /* MOVE_Y_POSITION */:
          e.position.y = e.position.y + parameter & 65535;
          break;
        case 5 /* TILE_DAMAGE */:
          funcTileDamage(e);
          break;
        case 6 /* PLAY_VOICE */:
          G.onSound(parameter, e.position);
          break;
        case 7 /* SCREEN_SHAKE */:
          onScreenShake();
          break;
        case 8 /* SET_ANIMATION */: {
          break;
        }
        case 9 /* BLOOM_EXPLOSION */: {
          const packed = packTile(e.position);
          if (G.map[packed].groundTileID === G.bloomTileID) mapBloomExplodeSpice(packed, G.playerHouseID);
          break;
        }
        default:
          funcStop(e);
          break;
      }
    }
    if (e.commands === null || e.timeOut > explosionTimer) continue;
    explosionTimer = e.timeOut;
  }
}

// web/src/game/names.ts
var UNIT_NAMES = [
  "\u0422\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442\u043D\u0438\u043A",
  // 0 UNIT_CARRYALL
  "\u041E\u0440\u043D\u0438\u0442\u043E\u043F\u0442\u0435\u0440",
  // 1 UNIT_ORNITHOPTER
  "\u041F\u0435\u0445\u043E\u0442\u0430",
  // 2 UNIT_INFANTRY
  "\u0422\u044F\u0436\u0451\u043B\u0430\u044F \u043F\u0435\u0445\u043E\u0442\u0430",
  // 3 UNIT_TROOPERS
  "\u0421\u043E\u043B\u0434\u0430\u0442",
  // 4 UNIT_SOLDIER
  "\u0428\u0442\u0443\u0440\u043C\u043E\u0432\u0438\u043A",
  // 5 UNIT_TROOPER
  "\u0414\u0438\u0432\u0435\u0440\u0441\u0430\u043D\u0442",
  // 6 UNIT_SABOTEUR
  "\u0420\u0430\u043A\u0435\u0442\u043D\u0430\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430",
  // 7 UNIT_LAUNCHER
  "\u0414\u0435\u0432\u0438\u0430\u0442\u043E\u0440",
  // 8 UNIT_DEVIATOR
  "\u0422\u0430\u043D\u043A",
  // 9 UNIT_TANK
  "\u041E\u0441\u0430\u0434\u043D\u044B\u0439 \u0442\u0430\u043D\u043A",
  // 10 UNIT_SIEGE_TANK
  "\u041E\u043F\u0443\u0441\u0442\u043E\u0448\u0438\u0442\u0435\u043B\u044C",
  // 11 UNIT_DEVASTATOR
  "\u0417\u0432\u0443\u043A\u043E\u0432\u043E\u0439 \u0442\u0430\u043D\u043A",
  // 12 UNIT_SONIC_TANK
  "\u0422\u0440\u0430\u0439\u043A",
  // 13 UNIT_TRIKE
  "\u0420\u0435\u0439\u0434\u0435\u0440",
  // 14 UNIT_RAIDER_TRIKE
  "\u041A\u0432\u0430\u0434\u0440\u043E\u0446\u0438\u043A\u043B",
  // 15 UNIT_QUAD
  "\u0425\u0430\u0440\u0432\u0435\u0441\u0442\u0435\u0440",
  // 16 UNIT_HARVESTER
  "MCV",
  // 17 UNIT_MCV
  "\u0420\u0430\u043A\u0435\u0442\u0430 \u0434\u0432\u043E\u0440\u0446\u0430",
  "\u0420\u0430\u043A\u0435\u0442\u0430",
  "\u0417\u0435\u043D\u0438\u0442\u043D\u0430\u044F \u0440\u0430\u043A\u0435\u0442\u0430",
  "\u0420\u0430\u043A\u0435\u0442\u0430 \u0434\u0435\u0432\u0438\u0430\u0442\u043E\u0440\u0430",
  "\u0420\u0430\u043A\u0435\u0442\u0430 \u043F\u0435\u0445\u043E\u0442\u044B",
  "\u0421\u043D\u0430\u0440\u044F\u0434",
  "\u0417\u0432\u0443\u043A\u043E\u0432\u0430\u044F \u0432\u043E\u043B\u043D\u0430",
  "\u041F\u0435\u0441\u0447\u0430\u043D\u044B\u0439 \u0447\u0435\u0440\u0432\u044C",
  "\u0424\u0440\u0435\u0433\u0430\u0442",
  "\u041B\u0430\u0437\u0435\u0440\u043D\u044B\u0439 \u0442\u0430\u043D\u043A",
  "\u0417\u0432\u0435\u043D\u043E \u0434\u0440\u043E\u043D\u043E\u0432"
];
var STRUCTURE_NAMES = [
  "\u0411\u0435\u0442\u043E\u043D\u043D\u0430\u044F \u043F\u043B\u0438\u0442\u0430",
  // 0 STRUCTURE_SLAB_1x1
  "\u0411\u0435\u0442\u043E\u043D 2\xD72",
  // 1 STRUCTURE_SLAB_2x2
  "\u0414\u0432\u043E\u0440\u0435\u0446",
  // 2 STRUCTURE_PALACE
  "\u041B\u0451\u0433\u043A\u0438\u0439 \u0437\u0430\u0432\u043E\u0434",
  // 3 STRUCTURE_LIGHT_VEHICLE
  "\u0422\u044F\u0436\u0451\u043B\u044B\u0439 \u0437\u0430\u0432\u043E\u0434",
  // 4 STRUCTURE_HEAVY_VEHICLE
  "\u0417\u0430\u0432\u043E\u0434 \u0445\u0430\u0439-\u0442\u0435\u043A",
  // 5 STRUCTURE_HIGH_TECH
  "\u0414\u043E\u043C IX",
  // 6 STRUCTURE_HOUSE_OF_IX
  "\u041A\u0430\u0437\u0430\u0440\u043C\u044B WOR",
  // 7 STRUCTURE_WOR_TROOPER
  "\u0421\u0442\u0440\u043E\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0434\u0432\u043E\u0440",
  // 8 STRUCTURE_CONSTRUCTION_YARD
  "\u0412\u0435\u0442\u0440\u044F\u043A",
  // 9 STRUCTURE_WINDTRAP
  "\u041A\u0430\u0437\u0430\u0440\u043C\u044B",
  // 10 STRUCTURE_BARRACKS
  "\u041A\u043E\u0441\u043C\u043E\u043F\u043E\u0440\u0442",
  // 11 STRUCTURE_STARPORT
  "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u0432\u043E\u0434",
  // 12 STRUCTURE_REFINERY
  "\u0420\u0435\u043C\u043E\u043D\u0442\u043D\u044B\u0439 \u0446\u0435\u0445",
  // 13 STRUCTURE_REPAIR
  "\u0421\u0442\u0435\u043D\u0430",
  // 14 STRUCTURE_WALL
  "\u0422\u0443\u0440\u0435\u043B\u044C",
  // 15 STRUCTURE_TURRET
  "\u0420\u0430\u043A\u0435\u0442\u043D\u0430\u044F \u0442\u0443\u0440\u0435\u043B\u044C",
  // 16 STRUCTURE_ROCKET_TURRET
  "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043F\u0440\u044F\u043D\u043E\u0441\u0442\u0438",
  // 17 STRUCTURE_SILO
  "\u0420\u0430\u0434\u0430\u0440",
  // 18 STRUCTURE_OUTPOST
  "\u041F\u043B\u043E\u0449\u0430\u0434\u043A\u0430 \u0434\u0440\u043E\u043D\u043E\u0432"
  // 19 DRONE_PAD
];

// web/src/engine/refinery-dock.ts
function refineryDock(position) {
  return { x: (position.x & 65280) + 2 * 256 + 128, y: (position.y & 65280) + 256 + 128 };
}
function refineryExit(position) {
  const dock = refineryDock(position);
  return { x: dock.x, y: dock.y + 256 };
}

// web/src/engine/carryall-flight.ts
function carryallDestination(encoded) {
  const s = indexGetStructure(encoded);
  return s?.o.type === STRUCTURE.REFINERY ? refineryDock(s.o.position) : indexGetTile(encoded);
}
function tickCarryallFlight(u) {
  if (u.o.type !== UNIT.CARRYALL) return;
  const f = u.carryallFlight ??= { height: 12, serviceKey: "", serviceSince: -1, lastTick: G.timerGame };
  const dt = Math.min(6, Math.max(0, G.timerGame - f.lastTick));
  f.lastTick = G.timerGame;
  const key = `${u.targetMove}:${u.o.linkedID}`;
  if (f.serviceKey !== key) {
    f.serviceKey = key;
    f.serviceSince = -1;
    f.settling = false;
  }
  const distance2 = u.targetMove ? tileGetDistance(u.o.position, carryallDestination(u.targetMove)) : 4096;
  const desired = f.settling ? 0 : 12 * Math.min(1, Math.max(0, (distance2 - 64) / 512));
  f.height += Math.max(-0.14 * dt, Math.min(0.12 * dt, (desired - f.height) * 0.065 * dt));
}
function carryallMovementScale(u) {
  if (u.o.type !== UNIT.CARRYALL) return 1;
  const distance2 = u.targetMove ? tileGetDistance(u.o.position, carryallDestination(u.targetMove)) : 4096;
  return 0.6 * (0.4 + 0.6 * Math.min(1, distance2 / 768));
}
function carryallReadyForService(u) {
  const f = u.carryallFlight;
  if (!f) return true;
  f.settling = true;
  if (f.height > 0.35) {
    f.serviceSince = -1;
    return false;
  }
  if (f.serviceSince < 0) f.serviceSince = G.timerGame;
  return G.timerGame - f.serviceSince >= 30;
}

// web/src/engine/object.ts
function objectScriptVariable4Link(encodedFrom, encodedTo) {
  if (!indexIsValid(encodedFrom)) return;
  if (!indexIsValid(encodedTo)) return;
  const from = indexGetObject(encodedFrom);
  const to = indexGetObject(encodedTo);
  if (!from || !to) return;
  if (from.script.variables[4] !== to.script.variables[4]) {
    objectScriptVariable4Clear(from);
    objectScriptVariable4Clear(to);
  }
  if (from.script.variables[4] !== 0) return;
  objectScriptVariable4Set(from, encodedTo);
  objectScriptVariable4Set(to, encodedFrom);
}
function objectScriptVariable4Set(o, encoded) {
  if (!o) return;
  o.script.variables[4] = encoded;
  if (o.flags.isUnit) return;
  const si = structureInfo[o.type];
  if (!si.o.flags.busyStateIsIncoming) return;
  const s = G.structures[o.index];
  if (structureGetLinkedUnit(s)) return;
  structureSetState(s, encoded === 0 ? STATE.IDLE : STATE.BUSY);
}
function objectScriptVariable4Clear(o) {
  const encoded = o.script.variables[4];
  if (encoded === 0) return;
  const other = indexGetObject(encoded);
  objectScriptVariable4Set(o, 0);
  objectScriptVariable4Set(other, 0);
}
function objectGetByPackedTile(packed) {
  if ((packed & 61440) !== 0) return null;
  const t = G.map[packed];
  if (t.hasUnit) return G.units[t.index - 1]?.o ?? null;
  if (t.hasStructure) return G.structures[t.index - 1]?.o ?? null;
  return null;
}
function objectGetDistanceToEncoded(o, encoded) {
  const s = indexGetStructure(encoded);
  let position;
  if (s) {
    let packed = packTile(s.o.position);
    packed += layoutEdgeTiles[structureInfo[s.o.type].layout][orientation8(tileGetDirection(o.position, s.o.position)) + 4 & 7];
    position = unpackTile(packed & 65535);
  } else {
    position = indexGetTile(encoded);
  }
  return tileGetDistance(o.position, position);
}

// web/src/engine/script.ts
var OPCODES_PER_TICK = 50;
function scriptError(script, msg2) {
  const o = G.scriptCurrentObject;
  console.warn(`[SCRIPT] ${msg2}; \u043E\u0431\u044A\u0435\u043A\u0442 ${o?.index ?? "?"} \u0442\u0438\u043F ${o?.type ?? "?"}`);
  script.pc = -1;
}
function push(script, value) {
  if (script.stackPointer === 0) {
    scriptError(script, "\u043F\u0435\u0440\u0435\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0441\u0442\u0435\u043A\u0430");
    return;
  }
  script.stack[--script.stackPointer] = u16(value);
}
function pop(script) {
  if (script.stackPointer >= 15) {
    scriptError(script, "\u0441\u0442\u0435\u043A \u043F\u0443\u0441\u0442");
    return 0;
  }
  return script.stack[script.stackPointer++];
}
function peek(script, position) {
  if (script.stackPointer >= 16 - position) {
    scriptError(script, "\u0432\u044B\u0445\u043E\u0434 \u0437\u0430 \u0441\u0442\u0435\u043A");
    return 0;
  }
  return script.stack[script.stackPointer + position - 1];
}
function scriptReset(script, info) {
  if (!info) return;
  script.pc = -1;
  script.scriptInfo = info;
  script.isSubroutine = 0;
  script.framePointer = 17;
  script.stackPointer = 15;
}
function scriptLoad(script, typeID) {
  const info = script.scriptInfo;
  if (!info) return;
  scriptReset(script, info);
  script.pc = info.offsets[info === G.scriptUnit ? customScriptType(typeID) : info === G.scriptStructure && typeID === 19 ? 5 : typeID];
}
function scriptLoadAsSubroutine(script, typeID) {
  if (!scriptIsLoaded(script)) return;
  if (script.isSubroutine !== 0) return;
  script.isSubroutine = 1;
  push(script, script.pc);
  push(script, script.returnValue);
  script.pc = script.scriptInfo.offsets[script.scriptInfo === G.scriptUnit ? customScriptType(typeID) : script.scriptInfo === G.scriptStructure && typeID === 19 ? 5 : typeID];
}
var scriptIsLoaded = (script) => script.pc >= 0 && script.scriptInfo !== null;
function scriptRun(script) {
  if (!scriptIsLoaded(script)) return false;
  const info = script.scriptInfo;
  const code = info.start;
  const current = code[script.pc++];
  let opcode = current >> 8 & 31;
  let parameter = 0;
  if (current & 32768) {
    opcode = 0;
    parameter = current & 32767;
  } else if (current & 16384) {
    parameter = u16(s8(current & 255));
  } else if (current & 8192) {
    parameter = code[script.pc++];
  }
  switch (opcode) {
    case 0:
      script.pc = parameter;
      return true;
    case 1:
      script.returnValue = parameter;
      return true;
    case 2:
      if (parameter === 0) {
        push(script, script.returnValue);
        return true;
      }
      if (parameter === 1) {
        push(script, script.pc + 1);
        push(script, script.framePointer);
        script.framePointer = script.stackPointer + 2;
        return true;
      }
      scriptError(script, `opcode 2: \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 ${parameter}`);
      return false;
    case 3:
    // PUSH
    case 4:
      push(script, parameter);
      return true;
    case 5:
      push(script, script.variables[parameter]);
      return true;
    case 6: {
      const i = script.framePointer - parameter - 2;
      if (i >= 15 || i < 0) {
        scriptError(script, "\u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u0432\u043D\u0435 \u0441\u0442\u0435\u043A\u0430");
        return false;
      }
      push(script, script.stack[i]);
      return true;
    }
    case 7: {
      const i = script.framePointer + parameter - 1;
      if (i >= 15 || i < 0) {
        scriptError(script, "\u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \u0432\u043D\u0435 \u0441\u0442\u0435\u043A\u0430");
        return false;
      }
      push(script, script.stack[i]);
      return true;
    }
    case 8:
      if (parameter === 0) {
        script.returnValue = pop(script);
        return true;
      }
      if (parameter === 1) {
        peek(script, 2);
        if (script.pc < 0) return false;
        script.framePointer = pop(script) & 255;
        script.pc = pop(script);
        return true;
      }
      scriptError(script, `opcode 8: \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 ${parameter}`);
      return false;
    case 9:
      script.variables[parameter] = pop(script);
      return true;
    case 10: {
      const i = script.framePointer - parameter - 2;
      if (i >= 15 || i < 0) {
        scriptError(script, "\u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u0432\u043D\u0435 \u0441\u0442\u0435\u043A\u0430");
        return false;
      }
      script.stack[i] = pop(script);
      return true;
    }
    case 11: {
      const i = script.framePointer + parameter - 1;
      if (i >= 15 || i < 0) {
        scriptError(script, "\u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \u0432\u043D\u0435 \u0441\u0442\u0435\u043A\u0430");
        return false;
      }
      script.stack[i] = pop(script);
      return true;
    }
    case 12:
      script.stackPointer = script.stackPointer + parameter & 255;
      return true;
    case 13:
      script.stackPointer = script.stackPointer - parameter & 255;
      return true;
    case 14: {
      parameter &= 255;
      const fn = info.functions[parameter];
      if (!fn) {
        scriptError(script, `\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0444\u0443\u043D\u043A\u0446\u0438\u044F ${parameter}`);
        return false;
      }
      script.returnValue = u16(fn(script));
      return true;
    }
    case 15:
      peek(script, 1);
      if (script.pc < 0) return false;
      if (pop(script) !== 0) return true;
      script.pc = parameter & 32767;
      return true;
    case 16:
      if (parameter === 0) push(script, pop(script) === 0 ? 1 : 0);
      else if (parameter === 1) push(script, -pop(script));
      else if (parameter === 2) push(script, ~pop(script));
      else {
        scriptError(script, `opcode 16: \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 ${parameter}`);
        return false;
      }
      return true;
    case 17: {
      const right = s16(pop(script));
      const left = s16(pop(script));
      let r;
      switch (parameter) {
        case 0:
          r = left && right ? 1 : 0;
          break;
        case 1:
          r = left || right ? 1 : 0;
          break;
        case 2:
          r = left === right ? 1 : 0;
          break;
        case 3:
          r = left !== right ? 1 : 0;
          break;
        case 4:
          r = left < right ? 1 : 0;
          break;
        case 5:
          r = left <= right ? 1 : 0;
          break;
        case 6:
          r = left > right ? 1 : 0;
          break;
        case 7:
          r = left >= right ? 1 : 0;
          break;
        case 8:
          r = left + right;
          break;
        case 9:
          r = left - right;
          break;
        case 10:
          r = left * right;
          break;
        case 11:
          r = right === 0 ? 0 : Math.trunc(left / right);
          break;
        case 12:
          r = left >> right;
          break;
        case 13:
          r = left << right;
          break;
        case 14:
          r = left & right;
          break;
        case 15:
          r = left | right;
          break;
        case 16:
          r = right === 0 ? 0 : left % right;
          break;
        case 17:
          r = left ^ right;
          break;
        default:
          scriptError(script, `opcode 17: \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 ${parameter}`);
          return false;
      }
      push(script, r);
      return true;
    }
    case 18:
      peek(script, 2);
      if (script.pc < 0) return false;
      script.returnValue = pop(script);
      script.pc = pop(script);
      script.isSubroutine = 0;
      return true;
    default:
      scriptError(script, `\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u043E\u043F\u043A\u043E\u0434 ${opcode}`);
      return false;
  }
}
function loadEmc(rom, form, functions) {
  const rd32 = (o2) => (rom[o2] << 24 | rom[o2 + 1] << 16 | rom[o2 + 2] << 8 | rom[o2 + 3]) >>> 0;
  const tag = (o2) => String.fromCharCode(rom[o2], rom[o2 + 1], rom[o2 + 2], rom[o2 + 3]);
  if (tag(form) !== "FORM" || tag(form + 8) !== "EMC2") throw new Error(`\u043D\u0435\u0442 FORM EMC2 \u043F\u043E \u0430\u0434\u0440\u0435\u0441\u0443 ${form.toString(16)}`);
  const end = form + 8 + rd32(form + 4);
  let o = form + 12;
  let offsets = new Uint16Array(0);
  let start = new Uint16Array(0);
  let text = new Uint8Array(0);
  while (o < end && /^[A-Z]{4}$/.test(tag(o))) {
    const id = tag(o);
    const len = rd32(o + 4);
    const words = new Uint16Array(len >> 1);
    for (let i = 0; i < words.length; i++) words[i] = rom[o + 8 + i * 2] << 8 | rom[o + 9 + i * 2];
    if (id === "ORDR") offsets = words;
    else if (id === "DATA") start = words;
    else if (id === "TEXT") text = rom.slice(o + 8, o + 8 + len);
    o += 8 + len + (len & 1);
  }
  return { start, offsets, functions, text };
}

// web/src/engine/structure.ts
var ticks = { degrade: 0, structure: 0, script: 0, palace: 0 };
function structureResetTimers() {
  for (const k of Object.keys(ticks)) ticks[k] = 0;
}
var isSlabOrWall = (t) => t === STRUCTURE.SLAB_1x1 || t === STRUCTURE.SLAB_2x2 || t === STRUCTURE.WALL;
var structureFree2 = structureFree;
function structureFrameStride(iconGroup, tiles) {
  const len = G.iconGroups[iconGroup]?.length ?? 0;
  if (len % 3 === 0 && len / 3 >= tiles) return len / 3;
  return tiles;
}
function gameLoopStructure() {
  let tickDegrade = false;
  let tickStructure = false;
  let tickScript = false;
  let tickPalace = false;
  const now = G.timerGame;
  if (ticks.degrade <= now && G.campaignID > 1) {
    tickDegrade = true;
    ticks.degrade = now + adjustToGameSpeed(10800, 5400, 21600, true);
  }
  if (ticks.structure <= now) {
    tickStructure = true;
    ticks.structure = now + adjustToGameSpeed(30, 15, 60, true);
  }
  if (ticks.script <= now) {
    tickScript = true;
    ticks.script = now + 5;
  }
  if (ticks.palace <= now) {
    tickPalace = true;
    ticks.palace = now + 60;
  }
  const find = findAll();
  for (; ; ) {
    const s = structureFind(find);
    if (!s) break;
    if (isSlabOrWall(s.o.type)) continue;
    const si = structureInfo[s.o.type];
    const h = G.houses[s.o.houseID];
    const hi = houseInfo[h.index];
    G.scriptCurrentObject = s.o;
    G.scriptCurrentStructure = s;
    G.scriptCurrentUnit = null;
    G.scriptCurrentTeam = null;
    if (tickPalace && s.o.type === STRUCTURE.PALACE) {
      if (s.specialWait !== 0) s.specialWait--;
      else if (s.countDown !== 0 && !(s.o.houseID === G.playerHouseID && structureLimitReached(s))) s.countDown--;
      if (s.countDown === 0 && !h.flags.human && h.flags.isAIActive) structureActivateSpecial(s);
    }
    if (tickDegrade && s.o.flags.degrades && s.o.hitpoints > idiv(si.o.hitpoints, 2)) structureDamage(s, hi.degradingAmount, 0);
    if (tickStructure) {
      if (s.o.flags.upgrading) {
        const upgradeCost = idiv(si.o.buildCredits, 40);
        if (upgradeCost <= h.credits) {
          h.credits -= upgradeCost;
          s.spent += upgradeCost;
          if (s.upgradeTimeLeft > 5) {
            s.upgradeTimeLeft -= 5;
          } else {
            s.upgradeLevel++;
            s.o.flags.upgrading = false;
            if (s.o.houseID === HOUSE.ORDOS && s.o.type === STRUCTURE.HEAVY_VEHICLE && s.upgradeLevel === 2) s.upgradeLevel = 3;
            s.upgradeTimeLeft = structureIsUpgradable(s) ? 100 : 0;
          }
        } else {
          s.o.flags.upgrading = false;
        }
      } else if (s.o.flags.repairing) {
        const repairCost = idiv(idiv(2 * 256, si.o.hitpoints) * si.o.buildCredits + 128, 256);
        if (repairCost <= h.credits) {
          h.credits -= repairCost;
          s.o.hitpoints += s.o.houseID === G.playerHouseID || G.campaignID >= 3 ? 5 : 3;
          if (s.o.hitpoints > si.o.hitpoints) {
            s.o.hitpoints = si.o.hitpoints;
            s.o.flags.repairing = false;
            s.o.flags.onHold = false;
          }
        } else {
          s.o.flags.repairing = false;
        }
      } else {
        if (!s.o.flags.onHold && s.countDown !== 0 && s.o.linkedID !== 255 && s.state === STATE.BUSY && si.o.flags.factory) {
          let oi;
          if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) oi = structureInfo[s.objectType].o;
          else if (s.o.type === STRUCTURE.REPAIR) oi = unitInfo[G.units[s.o.linkedID].o.type].o;
          else oi = unitInfo[s.objectType].o;
          let buildSpeed = 256;
          if (s.o.hitpoints < si.o.hitpoints) buildSpeed = idiv(s.o.hitpoints * 256, si.o.hitpoints);
          if (G.playerHouseID !== s.o.houseID) {
            if (buildSpeed > G.campaignID * 20 + 95) buildSpeed = G.campaignID * 20 + 95;
            buildSpeed = idiv(buildSpeed * [82, 100, 125][G.difficulty], 100);
          }
          let buildCost = s.prepaidUnitCost !== void 0 ? 0 : u16(idiv(oi.buildCredits * 256, oi.buildTime));
          if (buildSpeed < 256) buildCost = u16(idiv(buildSpeed * buildCost, 256));
          if (s.o.type === STRUCTURE.REPAIR && buildCost > 4) buildCost = idiv(buildCost, 4);
          buildCost = u16(buildCost + s.buildCostRemainder);
          if (idiv(buildCost, 256) <= h.credits) {
            s.buildCostRemainder = buildCost & 255;
            h.credits -= idiv(buildCost, 256);
            s.spent += idiv(buildCost, 256);
            if (buildSpeed < s.countDown) {
              s.countDown -= buildSpeed;
            } else {
              s.countDown = 0;
              s.buildCostRemainder = 0;
              structureSetState(s, STATE.READY);
              if (s.o.houseID === G.playerHouseID) {
                if (s.o.type !== STRUCTURE.BARRACKS && s.o.type !== STRUCTURE.WOR_TROOPER) {
                  G.onMessage(msg.buildComplete(s.o.type, s.objectType), 0);
                  if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) G.onConstructionComplete();
                  else G.onFeedback(0);
                }
              } else if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
                const ns = G.structures[s.o.linkedID];
                s.o.linkedID = 255;
                structureSetState(s, STATE.IDLE);
                let i = 0;
                for (; i < 5; i++) {
                  if (ns.o.type !== h.ai_structureRebuild[i][0]) continue;
                  if (!structurePlace(ns, h.ai_structureRebuild[i][1])) continue;
                  h.ai_structureRebuild[i][0] = 0;
                  h.ai_structureRebuild[i][1] = 0;
                  break;
                }
                if (i === 5) {
                  h.credits += structureInfo[ns.o.type].o.buildCredits;
                  structureFree2(ns);
                }
              }
            }
          } else if (s.o.houseID === G.playerHouseID) {
            s.o.flags.onHold = true;
            G.onMessage(msg.insufficientFunds, 0);
          }
        }
        if (s.o.type === STRUCTURE.REPAIR) {
          if (!s.o.flags.onHold && s.countDown !== 0 && s.o.linkedID !== 255) {
            const ui = unitInfo[G.units[s.o.linkedID].o.type];
            let repairSpeed = 256;
            if (s.o.hitpoints < si.o.hitpoints) repairSpeed = idiv(s.o.hitpoints * 256, si.o.hitpoints);
            const repairCost = idiv(2 * ui.o.buildCredits, 256);
            if (repairCost < h.credits) {
              h.credits -= repairCost;
              if (repairSpeed < s.countDown) {
                s.countDown -= repairSpeed;
              } else {
                s.countDown = 0;
                structureSetState(s, STATE.READY);
                if (s.o.houseID === G.playerHouseID) G.onFeedback(G.playerHouseID + 55);
              }
            }
          } else if (h.credits !== 0) {
            s.o.flags.onHold = false;
          }
        }
        if (h.flags.isAIActive && s.o.flags.allocated && s.o.houseID !== G.playerHouseID && h.credits !== 0) {
          if (s.o.hitpoints < idiv(si.o.hitpoints, 2)) structureSetRepairingState(s, 1);
          if (si.o.flags.factory && s.countDown === 0 && s.o.linkedID === 255) {
            const type = structureAIPickNextToBuild(s);
            if (type !== 65535) structureBuildObject(s, type);
          }
        }
      }
    }
    structureStartNextUnit(s);
    if (tickScript) {
      if (s.o.script.delay !== 0) {
        s.o.script.delay--;
      } else if (scriptIsLoaded(s.o.script)) {
        let i = 0;
        for (; i < 3; i++) if (!scriptRun(s.o.script)) break;
        if (i !== 3) return;
      } else {
        scriptReset(s.o.script, s.o.script.scriptInfo);
        scriptLoad(s.o.script, s.o.type);
      }
    }
  }
}
function structureCreate(index, typeID, houseID, position) {
  if (houseID >= 6) return null;
  if (typeID >= STRUCTURE.MAX) return null;
  const si = structureInfo[typeID];
  const s = structureAllocate(index, typeID);
  if (!s) return null;
  s.o.houseID = houseID;
  s.creatorHouseID = houseID;
  s.o.flags.isNotOnMap = true;
  s.o.position = { x: 0, y: 0 };
  s.o.linkedID = 255;
  s.unitQueue = [];
  s.prepaidUnitCost = void 0;
  s.state = STATE.JUSTBUILT;
  if (typeID === STRUCTURE.TURRET || typeID === STRUCTURE.ROCKET_TURRET) s.rotationSpriteDiff = G.iconGroups[si.iconGroup][1];
  s.o.hitpoints = si.o.hitpoints;
  s.hitpointsMax = si.o.hitpoints;
  if (houseID === HOUSE.HARKONNEN && typeID === STRUCTURE.LIGHT_VEHICLE) s.upgradeLevel = 1;
  if (si.o.flags.factory) s.upgradeTimeLeft = structureIsUpgradable(s) ? 100 : 0;
  s.objectType = 65535;
  structureBuildObject(s, 65534);
  s.countDown = 0;
  if (houseID !== G.playerHouseID) {
    while (structureIsUpgradable(s)) s.upgradeLevel++;
    s.upgradeTimeLeft = 0;
  }
  if (position !== 65535 && !structurePlace(s, position)) {
    structureFree2(s);
    return null;
  }
  return s;
}
function structurePlace(s, position) {
  if (!s) return false;
  if (position === 65535) return false;
  const si = structureInfo[s.o.type];
  switch (s.o.type) {
    case STRUCTURE.WALL: {
      if (structureIsValidBuildLocation(position, STRUCTURE.WALL) === 0) return false;
      const t = G.map[position];
      t.groundTileID = G.wallTileID + 1;
      t.houseID = s.o.houseID;
      G.mapTileID[position] |= 32768;
      if (s.o.houseID === G.playerHouseID) tileRemoveFogInRadius(unpackTile(position), 1);
      if (mapIsPositionUnveiled(position)) t.overlayTileID = 0;
      structureConnectWall(position, true);
      structureFree2(s);
      return true;
    }
    case STRUCTURE.SLAB_1x1:
    case STRUCTURE.SLAB_2x2: {
      let result = 0;
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < layoutTileCount[si.layout]; i++) {
          const curPos = position + layoutTiles[si.layout][i];
          const t = G.map[curPos];
          if (t.groundTileID === G.builtSlabTileID && t.houseID === s.o.houseID) continue;
          if (structureIsValidBuildLocation(curPos, STRUCTURE.SLAB_1x1) === 0) continue;
          t.groundTileID = G.builtSlabTileID;
          t.houseID = s.o.houseID;
          G.mapTileID[curPos] |= 32768;
          if (s.o.houseID === G.playerHouseID) tileRemoveFogInRadius(unpackTile(curPos), 1);
          if (mapIsPositionUnveiled(curPos)) t.overlayTileID = 0;
          result = 1;
          changed = true;
        }
      }
      if (result === 0) return false;
      structureFree2(s);
      return true;
    }
  }
  const validBuildLocation = structureIsValidBuildLocation(position, s.o.type);
  if (validBuildLocation === 0 && s.o.houseID === G.playerHouseID && G.validateStrictIfZero === 0) return false;
  if (s.o.houseID === G.playerHouseID) tileRemoveFogInRadius(unpackTile(position), 2);
  s.o.seenByHouses |= 1 << s.o.houseID;
  if (s.o.houseID === G.playerHouseID) s.o.seenByHouses |= 255;
  s.o.flags.isNotOnMap = false;
  s.o.position = unpackTile(position);
  s.o.position.x &= 65280;
  s.o.position.y &= 65280;
  s.rotationSpriteDiff = 0;
  s.o.hitpoints = si.o.hitpoints;
  s.hitpointsMax = si.o.hitpoints;
  if (validBuildLocation < 0) {
    const tilesWithoutSlab = -validBuildLocation;
    const structureTileCount = layoutTileCount[si.layout];
    s.o.hitpoints -= idiv(idiv(si.o.hitpoints, 2) * tilesWithoutSlab, structureTileCount);
    s.o.flags.degrades = true;
  } else {
    s.o.flags.degrades = true;
  }
  scriptReset(s.o.script, G.scriptStructure);
  s.o.script.variables[0] = 0;
  s.o.script.variables[4] = 0;
  s.o.script.delay = 0;
  scriptReset(s.o.script, s.o.script.scriptInfo);
  scriptLoad(s.o.script, s.o.type);
  for (let i = 0; i < layoutTileCount[si.layout]; i++) {
    const curPos = position + layoutTiles[si.layout][i];
    unitRemove(unitGetByPackedTile(curPos));
  }
  if (s.o.type === STRUCTURE.WINDTRAP) G.houses[s.o.houseID].windtrapCount += 1;
  if (G.validateStrictIfZero === 0) houseCalculatePowerAndCredit(G.houses[s.o.houseID]);
  structureUpdateMap(s);
  const h = G.houses[s.o.houseID];
  h.structuresBuilt = structureGetStructuresBuilt(h);
  return true;
}
function structureCalculateHitpointsMax(h) {
  if (!h) return;
  if (h.index === G.playerHouseID) houseUpdateRadarState(h);
  const power = h.powerUsage === 0 ? 256 : Math.min(idiv(h.powerProduction * 256, h.powerUsage), 256);
  const find = findAll(h.index);
  for (; ; ) {
    const s = structureFind(find);
    if (!s) return;
    if (isSlabOrWall(s.o.type)) continue;
    const si = structureInfo[s.o.type];
    s.hitpointsMax = idiv(si.o.hitpoints * power, 256);
    s.hitpointsMax = Math.max(s.hitpointsMax, idiv(si.o.hitpoints, 2));
    if (s.hitpointsMax >= s.o.hitpoints) continue;
    structureDamage(s, 1, 0);
  }
}
function structureSetState(s, state) {
  if (!s) return;
  s.state = state;
  structureUpdateMap(s);
}
function structureGetByPackedTile(packed) {
  if ((packed & 61440) !== 0) return null;
  const t = G.map[packed];
  if (!t.hasStructure) return null;
  return G.structures[t.index - 1] ?? null;
}
function structureGetStructuresBuilt(h) {
  if (!h) return 0;
  let result = 0;
  h.windtrapCount = 0;
  const find = findAll(h.index);
  for (; ; ) {
    const s = structureFind(find);
    if (!s) break;
    if (s.o.flags.isNotOnMap) continue;
    if (isSlabOrWall(s.o.type)) continue;
    result |= 1 << s.o.type;
    if (s.o.type === STRUCTURE.WINDTRAP) h.windtrapCount++;
  }
  return result >>> 0;
}
function structureIsValidBuildLocation(position, type) {
  const si = structureInfo[type];
  const layoutTile = layoutTiles[si.layout];
  if (type === STRUCTURE.SLAB_2x2) {
    const paved = /* @__PURE__ */ new Set();
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < layoutTileCount[si.layout]; i++) {
        const curPos = u16(position + layoutTile[i]);
        if (paved.has(curPos)) continue;
        if (!mapIsValidPosition(curPos)) continue;
        const lst = mapGetLandscapeType(curPos);
        if (!landscapeInfo[lst].isValidForStructure && G.validateStrictIfZero === 0) continue;
        if (objectGetByPackedTile(curPos) !== null) continue;
        const t = G.map[curPos];
        if (t.groundTileID === G.builtSlabTileID && t.houseID === G.playerHouseID) continue;
        let connected = false;
        if (G.validateStrictIfZero !== 0) {
          connected = true;
        } else {
          for (let j = 0; j < 16; j++) {
            const offset = layoutTilesAround[0][j];
            if (offset === 0) break;
            const adjPos = u16(curPos + offset);
            if (paved.has(adjPos)) {
              connected = true;
              break;
            }
            const s = structureGetByPackedTile(adjPos);
            if (s && s.o.houseID === G.playerHouseID) {
              connected = true;
              break;
            }
            const alst = mapGetLandscapeType(adjPos);
            if ((alst === LST.CONCRETE_SLAB || alst === LST.WALL) && G.map[adjPos & 4095].houseID === G.playerHouseID) {
              connected = true;
              break;
            }
          }
        }
        if (connected) {
          paved.add(curPos);
          changed = true;
        }
      }
    }
    return paved.size > 0 ? 1 : 0;
  }
  let isValid = true;
  let neededSlabs = 0;
  for (let i = 0; i < layoutTileCount[si.layout]; i++) {
    const curPos = u16(position + layoutTile[i]);
    const lst = mapGetLandscapeType(curPos);
    if (!mapIsValidPosition(curPos)) {
      isValid = false;
      break;
    }
    if (si.o.flags.notOnConcrete) {
      if (!landscapeInfo[lst].isValidForStructure2 && G.validateStrictIfZero === 0) {
        isValid = false;
        break;
      }
    } else {
      if (!landscapeInfo[lst].isValidForStructure && G.validateStrictIfZero === 0) {
        isValid = false;
        break;
      }
      if (lst !== LST.CONCRETE_SLAB) neededSlabs++;
    }
    if (objectGetByPackedTile(curPos) !== null) {
      isValid = false;
      break;
    }
  }
  if (G.validateStrictIfZero === 0 && isValid && type !== STRUCTURE.CONSTRUCTION_YARD) {
    isValid = false;
    for (let i = 0; i < 16; i++) {
      const offset = layoutTilesAround[si.layout][i];
      if (offset === 0) break;
      const curPos = u16(position + offset);
      const s = structureGetByPackedTile(curPos);
      if (s) {
        if (s.o.houseID !== G.playerHouseID) continue;
        isValid = true;
        break;
      }
      const lst = mapGetLandscapeType(curPos);
      if (lst !== LST.CONCRETE_SLAB && lst !== LST.WALL) continue;
      if (G.map[curPos & 4095].houseID !== G.playerHouseID) continue;
      isValid = true;
      break;
    }
  }
  if (!isValid) return 0;
  if (neededSlabs === 0) return 1;
  return -neededSlabs;
}
function structurePlacementDetail(position, type) {
  const si = structureInfo[type];
  const layoutTile = layoutTiles[si.layout];
  const count = layoutTileCount[si.layout];
  const valid = structureIsValidBuildLocation(position, type);
  if (type === STRUCTURE.SLAB_2x2) {
    const paved = /* @__PURE__ */ new Set();
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < count; i++) {
        const curPos = u16(position + layoutTile[i]);
        if (paved.has(curPos)) continue;
        if (!mapIsValidPosition(curPos)) continue;
        const lst = mapGetLandscapeType(curPos);
        if (!landscapeInfo[lst].isValidForStructure && G.validateStrictIfZero === 0) continue;
        if (objectGetByPackedTile(curPos) !== null) continue;
        const t = G.map[curPos];
        if (t.groundTileID === G.builtSlabTileID && t.houseID === G.playerHouseID) continue;
        let connected = false;
        if (G.validateStrictIfZero !== 0) {
          connected = true;
        } else {
          for (let j = 0; j < 16; j++) {
            const offset = layoutTilesAround[0][j];
            if (offset === 0) break;
            const adjPos = u16(curPos + offset);
            if (paved.has(adjPos)) {
              connected = true;
              break;
            }
            const s = structureGetByPackedTile(adjPos);
            if (s && s.o.houseID === G.playerHouseID) {
              connected = true;
              break;
            }
            const alst = mapGetLandscapeType(adjPos);
            if ((alst === LST.CONCRETE_SLAB || alst === LST.WALL) && G.map[adjPos & 4095].houseID === G.playerHouseID) {
              connected = true;
              break;
            }
          }
        }
        if (connected) {
          paved.add(curPos);
          changed = true;
        }
      }
    }
    const cells2 = [];
    for (let i = 0; i < count; i++) {
      const curPos = u16(position + layoutTile[i]);
      cells2.push(paved.has(curPos));
    }
    return { valid, cells: cells2 };
  }
  let touchesBase = type === STRUCTURE.CONSTRUCTION_YARD || G.validateStrictIfZero !== 0;
  if (!touchesBase) {
    for (let i = 0; i < 16; i++) {
      const offset = layoutTilesAround[si.layout][i];
      if (offset === 0) break;
      const curPos = u16(position + offset);
      const s = structureGetByPackedTile(curPos);
      if (s && s.o.houseID === G.playerHouseID) {
        touchesBase = true;
        break;
      }
      const lst = mapGetLandscapeType(curPos);
      if ((lst === LST.CONCRETE_SLAB || lst === LST.WALL) && G.map[curPos & 4095]?.houseID === G.playerHouseID) {
        touchesBase = true;
        break;
      }
    }
  }
  const cells = [];
  for (let i = 0; i < count; i++) {
    const curPos = u16(position + layoutTile[i]);
    if (!touchesBase || !mapIsValidPosition(curPos)) {
      cells.push(false);
      continue;
    }
    const lst = mapGetLandscapeType(curPos);
    let ok = si.o.flags.notOnConcrete ? landscapeInfo[lst].isValidForStructure2 : landscapeInfo[lst].isValidForStructure;
    if (objectGetByPackedTile(curPos) !== null) ok = 0;
    cells.push(ok !== 0);
  }
  return { valid, cells };
}
function structureActivateSpecial(s) {
  if (!s) return;
  if (s.o.type !== STRUCTURE.PALACE) return;
  const h = G.houses[s.o.houseID];
  if (!h.flags.used) return;
  switch (houseInfo[s.o.houseID].specialWeapon) {
    case HOUSE_WEAPON.MISSILE: {
      G.validateStrictIfZero++;
      const u = unitCreate(INDEX_INVALID, UNIT.MISSILE_HOUSE, s.o.houseID, { x: 65535, y: 65535 }, random256());
      G.validateStrictIfZero--;
      G.unitHouseMissile = u;
      if (!u) break;
      s.countDown = houseInfo[s.o.houseID].specialCountDown;
      s.specialWait = 300;
      if (!h.flags.human) {
        const find = findAll();
        for (; ; ) {
          const sf = structureFind(find);
          if (!sf) break;
          if (isSlabOrWall(sf.o.type)) continue;
          if (houseAreAllied(s.o.houseID, sf.o.houseID)) continue;
          unitLaunchHouseMissile(packTile(sf.o.position));
          return;
        }
        unitFree(u);
        G.unitHouseMissile = null;
        return;
      }
      G.houseMissileCountdown = 7;
      G.selectionType = SELECTION.TARGET;
      break;
    }
    case HOUSE_WEAPON.FREMEN: {
      const location = mapFindLocationTile(4, 255);
      for (let i = 0; i < 5; i++) {
        random256();
        let position = unpackTile(location);
        position = tileMoveByRandom(position, 32, true);
        const orientation = randomRange(0, 3);
        const unitType = orientation === 1 ? UNIT.TROOPER : UNIT.TROOPERS;
        G.validateStrictIfZero++;
        const u = unitCreate(INDEX_INVALID, unitType, HOUSE.FREMEN, position, orientation);
        G.validateStrictIfZero--;
        if (!u) continue;
        unitSetAction(u, ACTION.HUNT);
      }
      s.countDown = houseInfo[s.o.houseID].specialCountDown;
      s.specialWait = 180;
      break;
    }
    case HOUSE_WEAPON.SABOTEUR: {
      const position = structureFindFreePosition(s, false);
      if (position === 0) {
        s.countDown = 1;
        return;
      }
      G.validateStrictIfZero++;
      const u = unitCreate(INDEX_INVALID, UNIT.SABOTEUR, s.o.houseID, unpackTile(position), random256());
      G.validateStrictIfZero--;
      if (!u) return;
      unitSetAction(u, ACTION.SABOTAGE);
      s.countDown = houseInfo[s.o.houseID].specialCountDown;
      s.specialWait = 240;
      break;
    }
  }
}
function structureRemoveFog(s) {
  if (!s || s.o.houseID !== G.playerHouseID) return;
  tileRemoveFogInRadius(s.o.position, structureInfo[s.o.type].o.fogUncoverRadius);
}
function structureDestroy(s) {
  if (!s) return;
  s.o.script.variables[0] = 1;
  s.o.flags.allocated = false;
  s.o.flags.repairing = false;
  s.o.script.delay = 0;
  scriptReset(s.o.script, G.scriptStructure);
  scriptLoad(s.o.script, s.o.type);
  G.onSound(44, s.o.position);
  let linkedID = s.o.linkedID;
  if (linkedID !== 255) {
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
      structureDestroy(G.structures[linkedID]);
      s.o.linkedID = 255;
    } else {
      while (linkedID !== 255) {
        const u = G.units[linkedID];
        linkedID = u.o.linkedID;
        unitRemove(u);
      }
    }
  }
  const h = G.houses[s.o.houseID];
  const si = structureInfo[s.o.type];
  h.credits -= h.creditsStorage === 0 ? h.credits : Math.min(h.credits, idiv(idiv(h.credits * 256, h.creditsStorage) * si.creditsStorage, 256));
  if (s.o.houseID !== G.playerHouseID) h.credits += si.o.buildCredits + (G.campaignID > 7 ? idiv(si.o.buildCredits, 2) : 0);
  if (s.o.type !== STRUCTURE.WINDTRAP) return;
  h.windtrapCount--;
}
function structureDamage(s, damage, range) {
  if (!s) return false;
  if (G.playtester && s.o.houseID === G.playerHouseID) return false;
  if (damage === 0) return false;
  if (s.o.script.variables[0] === 1) return false;
  const si = structureInfo[s.o.type];
  s.o.hitpoints = s.o.hitpoints >= damage ? s.o.hitpoints - damage : 0;
  if (s.o.hitpoints === 0) {
    const score = Math.max(idiv(si.o.buildCredits, 100), 1);
    if (houseAreAllied(G.playerHouseID, s.o.houseID)) {
      G.scenario.destroyedAllied++;
      G.scenario.score -= Math.min(score, Math.max(0, G.scenario.score));
    } else {
      G.scenario.destroyedEnemy++;
      G.scenario.score += score;
    }
    structureDestroy(s);
    if (G.playerHouseID === s.o.houseID) {
      const index = [22, 23, 24][s.o.houseID] ?? 65535;
      G.onFeedback(index);
    } else {
      G.onFeedback(21);
    }
    structureUntargetMe(s);
    return true;
  }
  if (range === 0) return false;
  mapMakeExplosion(EXPLOSION.IMPACT_LARGE, tileAddDiff(s.o.position, layoutTileDiff[si.layout]), 0, 0);
  return false;
}
function structureIsUpgradable(s) {
  if (!s) return false;
  const si = structureInfo[s.o.type];
  if (s.o.houseID === HOUSE.HARKONNEN && s.o.type === STRUCTURE.HIGH_TECH) return false;
  if (s.o.houseID === HOUSE.ORDOS && s.o.type === STRUCTURE.HEAVY_VEHICLE && s.upgradeLevel === 1 && si.upgradeCampaign[2] > G.campaignID) return false;
  const uc = si.upgradeCampaign[s.upgradeLevel] ?? 0;
  if (uc !== 0 && uc <= G.campaignID + 1) {
    if (s.o.type !== STRUCTURE.CONSTRUCTION_YARD) return true;
    if (s.upgradeLevel !== 1) return true;
    const h = G.houses[s.o.houseID];
    const req = structureInfo[STRUCTURE.ROCKET_TURRET].o.structuresRequired;
    return (h.structuresBuilt & req) >>> 0 === req;
  }
  if (s.o.houseID === HOUSE.HARKONNEN && s.o.type === STRUCTURE.WOR_TROOPER && s.upgradeLevel === 0 && G.campaignID > 3) return true;
  return false;
}
var WALL = [
  0,
  3,
  1,
  2,
  3,
  3,
  4,
  5,
  1,
  6,
  1,
  7,
  8,
  9,
  10,
  11,
  1,
  12,
  1,
  19,
  1,
  16,
  1,
  31,
  1,
  28,
  1,
  52,
  1,
  45,
  1,
  59,
  3,
  3,
  13,
  20,
  3,
  3,
  22,
  32,
  3,
  3,
  13,
  53,
  3,
  3,
  38,
  60,
  5,
  6,
  7,
  21,
  5,
  6,
  7,
  33,
  5,
  6,
  7,
  54,
  5,
  6,
  7,
  61,
  9,
  9,
  9,
  9,
  17,
  17,
  23,
  34,
  9,
  9,
  9,
  9,
  25,
  46,
  39,
  62,
  11,
  12,
  11,
  12,
  13,
  18,
  13,
  35,
  11,
  12,
  11,
  12,
  13,
  47,
  13,
  63,
  15,
  15,
  16,
  16,
  17,
  17,
  24,
  36,
  15,
  15,
  16,
  16,
  17,
  17,
  40,
  64,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  37,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  65,
  27,
  27,
  27,
  27,
  27,
  27,
  27,
  27,
  14,
  29,
  14,
  55,
  26,
  48,
  41,
  66,
  29,
  30,
  29,
  30,
  29,
  30,
  29,
  30,
  31,
  30,
  31,
  56,
  31,
  49,
  31,
  67,
  33,
  33,
  34,
  34,
  33,
  33,
  34,
  34,
  35,
  35,
  15,
  57,
  35,
  35,
  42,
  68,
  37,
  38,
  39,
  40,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  58,
  41,
  42,
  43,
  69,
  45,
  45,
  45,
  45,
  46,
  46,
  46,
  46,
  47,
  47,
  47,
  47,
  27,
  50,
  43,
  70,
  49,
  50,
  49,
  50,
  51,
  52,
  51,
  52,
  53,
  54,
  53,
  54,
  55,
  51,
  55,
  71,
  57,
  57,
  58,
  58,
  59,
  59,
  60,
  60,
  61,
  61,
  62,
  62,
  63,
  63,
  44,
  72,
  65,
  66,
  67,
  68,
  69,
  70,
  71,
  72,
  73,
  74,
  75,
  76,
  77,
  78,
  79,
  73
];
function structureConnectWall(position, recurse) {
  let bits = 0;
  const isDestroyedWall = mapGetLandscapeType(position) === LST.DESTROYED_WALL;
  for (let i = 0; i < 4; i++) {
    const curPos = u16(position + tableMapDiff[i]);
    if (recurse && mapGetLandscapeType(curPos) === LST.WALL) structureConnectWall(curPos, false);
    if (isDestroyedWall) continue;
    const lst = mapGetLandscapeType(curPos);
    if (lst === LST.DESTROYED_WALL) bits |= 1 << i + 4;
    if (lst === LST.DESTROYED_WALL || lst === LST.WALL) bits |= 1 << i;
  }
  if (isDestroyedWall) return false;
  const tileID = G.wallTileID + WALL[bits & 15] + 1;
  const t = G.map[position];
  if (t.groundTileID === tileID) return false;
  t.groundTileID = tileID;
  G.mapTileID[position] |= 32768;
  return true;
}
function structureGetLinkedUnit(s) {
  if (s.o.linkedID === 255) return null;
  return G.units[s.o.linkedID];
}
function structureUntargetMe(s) {
  const encoded = indexEncode(s.o.index, 3 /* STRUCTURE */);
  objectScriptVariable4Clear(s.o);
  let find = findAll();
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.targetMove === encoded) u.targetMove = 0;
    if (u.targetAttack === encoded) u.targetAttack = 0;
    if (u.o.script.variables[4] === encoded) objectScriptVariable4Clear(u.o);
  }
  find = findAll();
  for (; ; ) {
    const t = teamFind(find);
    if (!t) break;
    if (t.target === encoded) t.target = 0;
  }
}
function structureFindFreePosition(s, checkForSpice) {
  if (!s) return 0;
  const si = structureInfo[s.o.type];
  const packed = packTile(tileCenter(s.o.position));
  const spicePacked = checkForSpice ? mapSearchSpice(packed, 10) : 0;
  let bestPacked = 0;
  let bestDistance = 0;
  let i = random256() & 15;
  for (let j = 0; j < 16; j++, i = i + 1 & 15) {
    const offset = layoutTilesAround[si.layout][i];
    if (offset === 0) continue;
    const curPacked = u16(packed + offset);
    if (!mapIsValidPosition(curPacked)) continue;
    const type = mapGetLandscapeType(curPacked);
    if (type === LST.WALL || type === LST.ENTIRELY_MOUNTAIN || type === LST.PARTIAL_MOUNTAIN) continue;
    const t = G.map[curPacked];
    if (t.hasUnit || t.hasStructure) continue;
    if (!checkForSpice) return curPacked;
    const d = tileGetDistancePacked(curPacked, spicePacked);
    if (bestDistance === 0 || d < bestDistance) {
      bestPacked = curPacked;
      bestDistance = d;
    }
  }
  return bestPacked;
}
function structureRemove(s) {
  if (!s) return;
  const si = structureInfo[s.o.type];
  const packed = packTile(s.o.position);
  for (let i = 0; i < layoutTileCount[si.layout]; i++) {
    const curPacked = packed + layoutTiles[si.layout][i];
    animationStopByTile(curPacked);
    G.map[curPacked].hasStructure = false;
  }
  animationStart(animationStructureRubble, s.o.position, si.layout, s.o.houseID, si.iconGroup);
  const h = G.houses[s.o.houseID];
  for (let i = 0; i < 5; i++) {
    if (h.ai_structureRebuild[i][0] !== 0) continue;
    h.ai_structureRebuild[i][0] = s.o.type;
    h.ai_structureRebuild[i][1] = packed;
    break;
  }
  structureFree2(s);
  structureUntargetMe(s);
  h.structuresBuilt = structureGetStructuresBuilt(h);
  houseUpdateCreditsStorage(s.o.houseID);
  switch (s.o.type) {
    case STRUCTURE.WINDTRAP:
      houseCalculatePowerAndCredit(h);
      break;
    case STRUCTURE.OUTPOST:
      houseUpdateRadarState(h);
      break;
  }
}
function structureCancelBuild(s) {
  if (!s || s.o.linkedID === 255) return;
  let oi;
  if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
    const s2 = G.structures[s.o.linkedID];
    oi = structureInfo[s2.o.type].o;
    structureFree2(s2);
  } else {
    const u = G.units[s.o.linkedID];
    oi = unitInfo[u.o.type].o;
    unitFree(u);
  }
  G.houses[s.o.houseID].credits += s.prepaidUnitCost ?? idiv(idiv((oi.buildTime - (s.countDown >> 8)) * 256, oi.buildTime) * oi.buildCredits, 256);
  s.prepaidUnitCost = void 0;
  s.o.flags.onHold = false;
  s.countDown = 0;
  s.o.linkedID = 255;
}
function structureStarportPrepare(s) {
  let linkedID = 255;
  const availableUnits = new Array(UNIT.MAX).fill(0);
  let loop;
  do {
    loop = false;
    for (let i = 0; i < UNIT.MAX; i++) {
      const unitsAtStarport = G.starportAvailable[i];
      if (unitsAtStarport === 0) unitInfo[i].o.available = 0;
      else if (unitsAtStarport < 0) unitInfo[i].o.available = -1;
      else if (unitsAtStarport > availableUnits[i]) {
        G.validateStrictIfZero++;
        const u = unitAllocate(INDEX_INVALID, i, s.o.houseID);
        G.validateStrictIfZero--;
        if (u) {
          loop = true;
          u.o.linkedID = linkedID;
          linkedID = u.o.index & 255;
          availableUnits[i]++;
          unitInfo[i].o.available = availableUnits[i];
        } else if (availableUnits[i] === 0) unitInfo[i].o.available = -1;
      }
    }
  } while (loop);
  while (linkedID !== 255) {
    const u = G.units[linkedID];
    linkedID = u.o.linkedID;
    unitFree(u);
  }
}
function structureStarportBuy(s, items) {
  const h = G.houses[s.o.houseID];
  for (const objectType of items) {
    G.validateStrictIfZero++;
    const u = unitCreate(INDEX_INVALID, objectType, s.o.houseID, { x: 65535, y: 65535 }, 0);
    G.validateStrictIfZero--;
    if (!u) {
      h.credits += unitInfo[UNIT.CARRYALL].o.buildCredits;
      if (s.o.houseID === G.playerHouseID) G.onMessage(msg.unableToCreateMore, 2);
      continue;
    }
    G.structureIndex = s.o.index;
    if (h.starportTimeLeft === 0) h.starportTimeLeft = houseInfo[h.index].starportDeliveryTime;
    u.o.linkedID = h.starportLinkedID & 255;
    h.starportLinkedID = u.o.index;
    G.starportAvailable[objectType]--;
    if (G.starportAvailable[objectType] <= 0) G.starportAvailable[objectType] = -1;
  }
}
function structureBuildObject(s, objectType, quiet = false) {
  if (!s) return false;
  const si = structureInfo[s.o.type];
  if (!si.o.flags.factory) return false;
  if (objectType === UNIT.LASER_TANK || objectType === UNIT.COMBAT_DRONE || s.o.type === STRUCTURE.CONSTRUCTION_YARD && objectType === STRUCTURE.DRONE_PAD) {
    if ((structureGetBuildable(s) & 1 << objectType) === 0) return false;
  }
  structureSetRepairingState(s, 0);
  if (objectType === 65533) {
    structureSetUpgradingState(s, 1);
    return false;
  }
  if (objectType === 65535 || objectType === 65534) {
    const buildable = structureGetBuildable(s);
    if (buildable === 0) {
      s.objectType = 0;
      return false;
    }
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
      G.factoryWindowConstructionYard = true;
      for (let i = 0; i < STRUCTURE.MAX; i++) {
        if ((buildable & 1 << i) === 0) continue;
        structureInfo[i].o.available = 1;
        if (objectType !== 65534) continue;
        s.objectType = i;
        return false;
      }
    } else {
      G.factoryWindowConstructionYard = false;
      if (s.o.type === STRUCTURE.STARPORT) {
        structureStarportPrepare(s);
      } else {
        for (let i = 0; i < UNIT.MAX; i++) {
          if ((buildable & 1 << i) === 0) continue;
          unitInfo[i].o.available = 1;
          if (objectType !== 65534) continue;
          s.objectType = i;
          return false;
        }
      }
    }
    if (objectType === 65535) return false;
    s.objectType = objectType;
  }
  if (s.o.type === STRUCTURE.STARPORT) return true;
  if (s.objectType !== objectType) structureCancelBuild(s);
  if (s.o.linkedID !== 255 || objectType === 65535) return false;
  let o;
  let oi;
  if (s.o.type !== STRUCTURE.CONSTRUCTION_YARD) {
    oi = unitInfo[objectType].o;
    o = unitCreate(INDEX_INVALID, objectType, s.o.houseID, { x: 65535, y: 65535 }, 0)?.o;
  } else {
    oi = structureInfo[objectType].o;
    o = structureCreate(INDEX_INVALID, objectType, s.o.houseID, 65535)?.o;
  }
  s.o.flags.onHold = false;
  if (o) {
    s.o.linkedID = o.index & 255;
    s.objectType = objectType;
    s.spent = 0;
    s.countDown = oi.buildTime << 8;
    structureSetState(s, STATE.BUSY);
    if (s.o.houseID !== G.playerHouseID) return true;
    G.onMessage(msg.productionStarted(s.o.type, objectType), 2);
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) G.onConstructionStart();
    return true;
  }
  if (s.o.houseID !== G.playerHouseID) return false;
  if (!quiet) G.onMessage(msg.unableToCreateMore, 2);
  return false;
}
function structureCanQueueUnits(s) {
  return s.o.houseID === G.playerHouseID && !!structureInfo[s.o.type].o.flags.factory && s.o.type !== STRUCTURE.CONSTRUCTION_YARD && s.o.type !== STRUCTURE.STARPORT && s.o.type !== STRUCTURE.REPAIR;
}
function structureEnqueueUnit(s, type) {
  if (!s.o.flags.allocated || !structureCanQueueUnits(s) || type < 0 || type >= UNIT.MAX || !(structureGetBuildable(s) & 1 << type)) return false;
  const queue = s.unitQueue ??= [], cost = unitInfo[type].o.buildCredits, h = G.houses[s.o.houseID];
  if (queue.length + (s.o.linkedID !== 255 ? 1 : 0) >= 20 || h.credits < cost) return false;
  h.credits -= cost;
  queue.push({ type, cost });
  s.unitQueue = queue;
  structureStartNextUnit(s);
  return true;
}
function structureStartNextUnit(s) {
  if (s.o.linkedID !== 255 || !s.o.flags.allocated) return;
  s.prepaidUnitCost = void 0;
  if (!s.unitQueue?.length || s.o.flags.onHold || s.o.flags.repairing || s.o.flags.upgrading) return;
  const item = s.unitQueue[0];
  if (structureBuildObject(s, item.type, true)) {
    s.unitQueue.shift();
    s.prepaidUnitCost = item.cost;
  }
}
function structureCancelQueuedUnit(s, index) {
  if (!Number.isInteger(index) || index < 0 || !s.unitQueue || index >= s.unitQueue.length) return false;
  const [item] = s.unitQueue.splice(index, 1);
  G.houses[s.o.houseID].credits += item.cost;
  return true;
}
function structureSetUpgradingState(s, state) {
  let ret = false;
  if (!s) return false;
  if (state === -1) state = s.o.flags.upgrading ? 0 : 1;
  if (state === 0 && s.o.flags.upgrading) {
    if (s.o.houseID === G.playerHouseID) G.onMessage(msg.upgradingStops, 2);
    s.o.flags.upgrading = false;
    s.o.flags.onHold = false;
    ret = true;
  }
  if (state === 0 || s.o.flags.upgrading || s.upgradeTimeLeft === 0) return ret;
  if (s.o.houseID === G.playerHouseID) G.onMessage(msg.upgradingStarts, 2);
  s.spent = 0;
  s.o.flags.onHold = true;
  s.o.flags.repairing = false;
  s.o.flags.upgrading = true;
  return true;
}
function structureSetRepairingState(s, state) {
  let ret = false;
  if (!s) return false;
  if (!s.o.flags.allocated) state = 0;
  if (state === -1) state = s.o.flags.repairing ? 0 : 1;
  if (state === 0 && s.o.flags.repairing) {
    if (s.o.houseID === G.playerHouseID) G.onMessage(msg.repairingStops, 2);
    s.o.flags.repairing = false;
    s.o.flags.onHold = false;
    ret = true;
  }
  if (state === 0 || s.o.flags.repairing || s.o.hitpoints === structureInfo[s.o.type].o.hitpoints) return ret;
  if (s.o.houseID === G.playerHouseID) G.onMessage(msg.repairingStarts, 2);
  s.o.flags.onHold = true;
  s.o.flags.repairing = true;
  return true;
}
function structureUpdateMap(s) {
  if (!s) return;
  if (!s.o.flags.used) return;
  if (s.o.flags.isNotOnMap) return;
  const si = structureInfo[s.o.type];
  const layout = layoutTiles[si.layout];
  const layoutSize2 = layoutTileCount[si.layout];
  const group = G.iconGroups[si.iconGroup];
  const base = structureFrameStride(si.iconGroup, layoutSize2) * 2;
  for (let i = 0; i < layoutSize2; i++) {
    const position = packTile(s.o.position) + layout[i];
    const t = G.map[position];
    t.houseID = s.o.houseID;
    t.hasStructure = true;
    t.index = s.o.index + 1;
    t.groundTileID = group[base + i] + s.rotationSpriteDiff & 511;
    if (tileIsUnveiled(t.overlayTileID)) t.overlayTileID = 0;
  }
  s.o.flags.isDirty = true;
  if (s.state >= STATE.IDLE) {
    const animationIndex = s.state > STATE.READY ? STATE.READY : s.state;
    animationStart(si.animations[animationIndex], s.o.position, si.layout, s.o.houseID, si.iconGroup);
  } else {
    animationStart(animationStructureBuild, s.o.position, si.layout, s.o.houseID, si.iconGroup);
  }
}
function structureGetBuildable(s) {
  if (!s) return 0;
  const si = structureInfo[s.o.type];
  const structuresBuilt = G.houses[s.o.houseID].structuresBuilt;
  let ret = 0;
  switch (s.o.type) {
    case STRUCTURE.LIGHT_VEHICLE:
    case STRUCTURE.HEAVY_VEHICLE:
    case STRUCTURE.HIGH_TECH:
    case STRUCTURE.WOR_TROOPER:
    case STRUCTURE.BARRACKS:
    case STRUCTURE.DRONE_PAD:
      for (let i = 0; i < UNIT.MAX; i++) unitInfo[i].o.available = 0;
      for (let i = 0; i < si.buildableUnits.length; i++) {
        let unitType = si.buildableUnits[i];
        if (unitType === UNIT.INVALID) continue;
        if (unitType === UNIT.TRIKE && s.creatorHouseID === HOUSE.ORDOS) unitType = UNIT.RAIDER_TRIKE;
        const ui = unitInfo[unitType];
        if (unitType >= 27 && G.campaignID + 1 < ui.o.availableCampaign) continue;
        let upgradeLevelRequired = ui.o.upgradeLevelRequired;
        if (unitType === UNIT.SIEGE_TANK && s.creatorHouseID === HOUSE.ORDOS) upgradeLevelRequired--;
        if ((structuresBuilt & ui.o.structuresRequired) >>> 0 !== ui.o.structuresRequired >>> 0) continue;
        if ((ui.o.availableHouse & 1 << s.creatorHouseID) === 0) continue;
        if (s.upgradeLevel >= upgradeLevelRequired) {
          ui.o.available = 1;
          ret |= 1 << unitType;
          continue;
        }
        if (s.upgradeTimeLeft !== 0 && s.upgradeLevel + 1 >= upgradeLevelRequired) ui.o.available = -1;
      }
      return ret >>> 0;
    case STRUCTURE.CONSTRUCTION_YARD:
      for (let i = 0; i < STRUCTURE.MAX; i++) {
        const lsi = structureInfo[i];
        lsi.o.available = 0;
        let availableCampaign = lsi.o.availableCampaign;
        let structuresRequired = lsi.o.structuresRequired >>> 0;
        if (i === STRUCTURE.WOR_TROOPER && s.o.houseID === HOUSE.HARKONNEN && G.campaignID >= 1) {
          structuresRequired = (structuresRequired & ~(1 << STRUCTURE.BARRACKS)) >>> 0;
          availableCampaign = 2;
        }
        if ((structuresBuilt & structuresRequired) >>> 0 === structuresRequired || s.o.houseID !== G.playerHouseID) {
          if (s.o.houseID !== HOUSE.HARKONNEN && i === STRUCTURE.LIGHT_VEHICLE) availableCampaign = 2;
          if (i === STRUCTURE.HEAVY_VEHICLE || i === STRUCTURE.HOUSE_OF_IX) continue;
          if (i === STRUCTURE.WOR_TROOPER && G.playerHouseID === HOUSE.ORDOS) continue;
          if (G.campaignID >= availableCampaign - 1 && (lsi.o.availableHouse & 1 << s.o.houseID) !== 0) {
            if (s.upgradeLevel >= lsi.o.upgradeLevelRequired || s.o.houseID !== G.playerHouseID) {
              lsi.o.available = 1;
              ret |= 1 << i;
            } else if (s.upgradeTimeLeft !== 0 && s.upgradeLevel + 1 >= lsi.o.upgradeLevelRequired) {
              lsi.o.available = -1;
            }
          }
        }
      }
      structureInfo[STRUCTURE.SLAB_2x2].o.available = 1;
      ret |= 1 << STRUCTURE.SLAB_2x2;
      if (s.o.houseID === G.playerHouseID && structurePoolFull()) {
        ret &= 1 << STRUCTURE.SLAB_2x2 | 1 << STRUCTURE.WALL;
      } else {
        if (structureCount(s.o.houseID, STRUCTURE.PALACE)) ret &= ~(1 << STRUCTURE.PALACE);
        if (structureCount(s.o.houseID, STRUCTURE.STARPORT)) ret &= ~(1 << STRUCTURE.STARPORT);
      }
      for (let i = 0; i < STRUCTURE.MAX; i++) if (!(ret & 1 << i) && structureInfo[i].o.available === 1) structureInfo[i].o.available = 0;
      return ret >>> 0;
    case STRUCTURE.STARPORT:
      return 4294967295;
    default:
      return 0;
  }
}
function structureCount(houseID, type) {
  let n = 0;
  for (const st of G.structures) if (st.o.flags.used && st.o.houseID === houseID && st.o.type === type) n++;
  return n;
}
var STRUCTURE_POOL_MD = 70;
function structurePoolFull() {
  let n = 0;
  for (const st of G.structures) {
    if (!st.o.flags.used) continue;
    const t = st.o.type;
    if (t !== STRUCTURE.SLAB_1x1 && t !== STRUCTURE.SLAB_2x2 && t !== STRUCTURE.WALL) n++;
  }
  return n >= STRUCTURE_POOL_MD;
}
function unitPoolHasFree(first, last) {
  for (let i = first; i <= last; i++) if (!G.units[i].o.flags.used) return true;
  return false;
}
var unitAirSlotFree = () => unitPoolHasFree(0, 10);
var unitGroundPoolFull = () => !unitPoolHasFree(25, 101);
function structureLimitReached(s) {
  const h = G.houses[s.o.houseID];
  switch (s.o.type) {
    case STRUCTURE.CONSTRUCTION_YARD:
      return structurePoolFull();
    case STRUCTURE.PALACE:
      return s.o.houseID === HOUSE.ATREIDES && unitGroundPoolFull();
    case STRUCTURE.LIGHT_VEHICLE:
    case STRUCTURE.HEAVY_VEHICLE:
    case STRUCTURE.WOR_TROOPER:
    case STRUCTURE.BARRACKS:
    case STRUCTURE.STARPORT:
      return !s.o.flags.upgrading && (unitGroundPoolFull() || h.unitCount >= h.unitCountMax);
    case STRUCTURE.HIGH_TECH:
      return !s.o.flags.upgrading && (s.objectType === UNIT.COMBAT_DRONE ? unitGroundPoolFull() || h.unitCount >= h.unitCountMax : !unitAirSlotFree());
    case STRUCTURE.DRONE_PAD:
      return !s.o.flags.upgrading && (unitGroundPoolFull() || h.unitCount >= h.unitCountMax);
    default:
      return false;
  }
}
function structureHouseUnderAttack(houseID) {
  const h = G.houses[houseID];
  if (houseID !== G.playerHouseID) h.flags.isAIActive = true;
  if (houseID !== G.playerHouseID && h.flags.doneFullScaleAttack) return;
  h.flags.doneFullScaleAttack = true;
  if (h.flags.human) {
    if (h.timerStructureAttack !== 0) return;
    G.onSound(62);
    h.timerStructureAttack = 8;
  }
}
function structureAIPickNextToBuild(s) {
  if (!s) return 65535;
  const h = G.houses[s.o.houseID];
  let buildable = structureGetBuildable(s);
  if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
    for (let i = 0; i < 5; i++) {
      const type2 = h.ai_structureRebuild[i][0];
      if (type2 === 0) continue;
      if ((buildable & 1 << type2) === 0) continue;
      return type2;
    }
    return 65535;
  }
  if (s.o.type === STRUCTURE.HIGH_TECH) {
    const find = findAll(s.o.houseID, UNIT.CARRYALL);
    for (; ; ) {
      const u = unitFind(find, unitGetHouseID);
      if (!u) break;
      buildable &= ~(1 << UNIT.CARRYALL);
    }
  }
  if (s.o.type === STRUCTURE.HEAVY_VEHICLE) {
    buildable &= ~(1 << UNIT.HARVESTER);
    buildable &= ~(1 << UNIT.MCV);
  }
  buildable &= 65535;
  let type = 65535;
  for (let i = 0; i < UNIT.MAX; i++) {
    if ((buildable & 1 << i) === 0) continue;
    if (random256() % 4 === 0) type = i;
    if (type !== 65535) {
      if (unitInfo[i].o.priorityBuild <= unitInfo[type].o.priorityBuild) continue;
    }
    type = i;
  }
  return type;
}
function structurePlayerPlace(position) {
  const s = G.structureActive;
  if (!s) return false;
  const type = s.o.type;
  if (structureIsValidBuildLocation(position, type) === 0) {
    G.onSound(47);
    G.onMessage(type === STRUCTURE.SLAB_1x1 || type === STRUCTURE.SLAB_2x2 ? msg.cannotPlaceFoundation : msg.cannotPlace(type), 2);
    return false;
  }
  if (!structurePlace(s, position)) {
    G.onSound(47);
    G.onMessage(type === STRUCTURE.SLAB_1x1 || type === STRUCTURE.SLAB_2x2 ? msg.cannotPlaceFoundation : msg.cannotPlace(type), 2);
    return false;
  }
  G.onSound(20);
  const h = G.houses[G.playerHouseID];
  if (type === STRUCTURE.PALACE) h.palacePosition = { ...s.o.position };
  if (type === STRUCTURE.REFINERY && G.validateStrictIfZero === 0) {
    G.validateStrictIfZero++;
    const u = unitCreateWrapperLazy(G.playerHouseID, UNIT.HARVESTER, indexEncode(s.o.index, 3 /* STRUCTURE */));
    G.validateStrictIfZero--;
    if (!u) h.harvestersIncoming++;
    else u.originEncoded = indexEncode(s.o.index, 3 /* STRUCTURE */);
  }
  G.selectionType = SELECTION.STRUCTURE;
  const cy = structureGetByPackedTile(G.structureActivePosition);
  if (cy && (structureGetBuildable(cy) & 1 << cy.objectType) === 0) structureBuildObject(cy, 65534);
  G.structureActiveType = 65535;
  G.structureActive = null;
  houseUpdateRadarState(h);
  if (h.powerProduction < h.powerUsage && (h.structuresBuilt & 1 << STRUCTURE.OUTPOST) !== 0) G.onMessage(msg.notEnoughPowerForRadar, 3);
  return true;
}
var unitCreateWrapperLazy = () => null;
function setUnitCreateWrapper(fn) {
  unitCreateWrapperLazy = fn;
}

// web/src/engine/advanced-units.ts
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var center = (s) => {
  const size = layoutSize[structureInfo[s.o.type].layout];
  return { x: s.o.position.x + size.width * 128, y: s.o.position.y + size.height * 128 };
};
function droneHome(u) {
  const d = u.drone;
  if (!d) return null;
  const s = indexGetStructure(d.home);
  return s?.o.flags.used && s.o.hitpoints > 0 && s.o.type === STRUCTURE.DRONE_PAD && s.o.houseID === u.o.houseID && distance(center(s), d.homePosition) < 1 ? s : null;
}
function initializeDrone(u, home) {
  if (u.o.type !== COMBAT_DRONE) return;
  const base = home ?? G.structureFind.filter((s) => s.o.flags.used && s.o.hitpoints > 0 && s.o.type === STRUCTURE.DRONE_PAD && s.o.houseID === u.o.houseID).sort((a, b) => distance(center(a), u.o.position) - distance(center(b), u.o.position))[0];
  const position = base ? center(base) : { ...u.o.position };
  if (home) u.o.position = { x: position.x, y: position.y + 64 };
  u.drone = {
    home: base ? indexEncode(base.o.index, 3 /* STRUCTURE */) : 0,
    homePosition: position,
    phase: base ? "guard" : "orphan",
    battery: 100,
    nextFire: 0,
    lastTick: G.timerGame,
    launchAfter: 0,
    vx: 0,
    vy: 0,
    restockAt: 0,
    members: [[-56, -56], [48, -56], [0, 24]].map(([x, y]) => ({ x: u.o.position.x + x, y: u.o.position.y + y, vx: 0, vy: 0, grenades: 5 }))
  };
  u.targetAttack = 0;
  u.targetMove = 0;
  u.actionID = ACTION.GUARD;
}
function clampDronePoint(u, p) {
  const home = u.drone?.homePosition;
  if (!home) return { ...p };
  const dx = p.x - home.x, dy = p.y - home.y, d = Math.hypot(dx, dy), r = DRONE_RADIUS - 64;
  const k = d > r ? r / d : 1;
  const b = G.mapScale === 0 ? { minX: 1, minY: 1, sizeX: 62, sizeY: 62 } : G.mapScale === 1 ? { minX: 16, minY: 16, sizeX: 32, sizeY: 32 } : { minX: 21, minY: 21, sizeX: 21, sizeY: 21 };
  return {
    x: Math.round(Math.max(b.minX * 256 + 32, Math.min((b.minX + b.sizeX) * 256 - 32, home.x + dx * k))),
    y: Math.round(Math.max(b.minY * 256 + 32, Math.min((b.minY + b.sizeY) * 256 - 32, home.y + dy * k)))
  };
}
function visibleEnemy(u, target) {
  if (!indexIsValid(target)) return false;
  const unit = indexGetUnit(target), s = indexGetStructure(target), o = unit?.o ?? s?.o;
  if (!o || !o.flags.used || o.flags.isNotOnMap || o.hitpoints <= 0 || houseAreAllied(u.o.houseID, o.houseID)) return false;
  if (unit && unitInfo[unit.o.type].movementType === MOVEMENT.WINGER) return false;
  if (s && s.o.type === STRUCTURE.WALL) return false;
  return G.revealAll || (o.seenByHouses & 1 << u.o.houseID) !== 0;
}
function droneTargetAllowed(u, target) {
  return !!u.drone && visibleEnemy(u, target) && distance(indexGetTile(target), u.drone.homePosition) <= DRONE_RADIUS;
}
function findDroneTarget(u) {
  let best = 0, bestScore = Infinity;
  for (const enemy of G.unitFind) {
    const id = indexEncode(enemy.o.index, 2 /* UNIT */);
    if (!droneTargetAllowed(u, id)) continue;
    const score = distance(u.o.position, enemy.o.position) * (unitInfo[enemy.o.type].movementType === MOVEMENT.FOOT ? 0.75 : 1);
    if (score < bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}
function moveDrone(u, goal, dt) {
  const target = clampDronePoint(u, goal), dx = target.x - u.o.position.x, dy = target.y - u.o.position.y, d = Math.hypot(dx, dy);
  const state = u.drone, speed = Math.min(18, Math.sqrt(d * 1.1));
  const desiredX = d > 1 ? dx / d * speed : 0, desiredY = d > 1 ? dy / d * speed : 0;
  const ax = desiredX - state.vx, ay = desiredY - state.vy, change = Math.hypot(ax, ay), a = Math.min(1, 0.55 * dt / Math.max(1e-3, change));
  state.vx += ax * a;
  state.vy += ay * a;
  if (d < 8 && Math.hypot(state.vx, state.vy) < 1) {
    state.vx = state.vy = 0;
    u.speed = 0;
    return true;
  }
  const heading = (Math.atan2(state.vx, -state.vy) * 128 / Math.PI + 256) % 256;
  const delta = (heading - u.orientation[0].current + 384) % 256 - 128;
  u.orientation[0].current = (u.orientation[0].current + Math.max(-7 * dt, Math.min(7 * dt, delta)) + 256) % 256;
  u.orientation[1].current = u.orientation[0].current;
  u.speed = 255;
  unitUpdateMap(0, u);
  u.o.position = clampDronePoint(u, { x: u.o.position.x + state.vx * dt, y: u.o.position.y + state.vy * dt });
  unitUpdateMap(1, u);
  tileRemoveFogInRadius(u.o.position, unitInfo[COMBAT_DRONE].o.fogUncoverRadius);
  return false;
}
function updateDroneMembers(u, dt) {
  const d = u.drone, parked = d.phase === "dock" || d.phase === "guard" && Math.hypot(u.o.position.x - d.homePosition.x, u.o.position.y - d.homePosition.y - 64) < 24;
  const offsets = parked ? [[-56, -56], [48, -56], [0, 24]] : [[-40, -28], [40, -28], [0, 40]], a = parked ? 0 : u.orientation[0].current * Math.PI / 128;
  for (let i = 0; i < d.members.length; i++) {
    const m = d.members[i], offset = offsets[i], goal = clampDronePoint(u, { x: u.o.position.x + offset[0] * Math.cos(a) - offset[1] * Math.sin(a), y: u.o.position.y + offset[0] * Math.sin(a) + offset[1] * Math.cos(a) });
    m.vx += (goal.x - m.x) * 0.035 * dt;
    m.vy += (goal.y - m.y) * 0.035 * dt;
    const damping = Math.pow(0.74 + i * 0.025, dt);
    m.vx *= damping;
    m.vy *= damping;
    const next = clampDronePoint(u, { x: m.x + m.vx * dt, y: m.y + m.vy * dt });
    m.x = next.x;
    m.y = next.y;
  }
}
function tickDroneGrenades() {
  const due = G.droneGrenades.filter((p) => p.impact <= G.timerGame);
  G.droneGrenades = G.droneGrenades.filter((p) => p.impact > G.timerGame);
  for (const p of due) mapMakeExplosion(EXPLOSION.IMPACT_SMALL, p.to, p.damage, p.origin, true);
}
function tickDrone(u) {
  if (u.o.type !== COMBAT_DRONE || u.actionID === ACTION.DIE || u.o.hitpoints <= 0) return false;
  if (u.o.flags.isNotOnMap) return true;
  if (!u.drone) initializeDrone(u);
  const d = u.drone, dt = Math.min(6, Math.max(0, G.timerGame - d.lastTick));
  d.lastTick = G.timerGame;
  if (!dt) return true;
  try {
    const home = droneHome(u), powered = !!home && G.houses[u.o.houseID].powerProduction >= G.houses[u.o.houseID].powerUsage;
    const homePos = clampDronePoint(u, { x: d.homePosition.x, y: d.homePosition.y + 64 });
    if (!home) {
      d.phase = "orphan";
      d.battery = Math.max(0, d.battery - 0.12 * dt);
    } else if (d.phase !== "dock") d.battery = Math.max(0, d.battery - 0.025 * dt);
    if (d.battery <= 0) {
      unitDamage(u, u.o.hitpoints, 0);
      return true;
    }
    const survivors = Math.max(1, Math.ceil(u.o.hitpoints / (unitInfo[COMBAT_DRONE].o.hitpoints / 3)));
    if (home && (d.battery < DRONE_RETURN_BATTERY || u.o.hitpoints < unitInfo[COMBAT_DRONE].o.hitpoints * 0.3 || !powered || u.actionID === ACTION.RETURN || d.members.slice(0, survivors).every((m) => m.grenades === 0))) d.phase = "return";
    if (d.phase === "return" || d.phase === "dock") {
      u.targetAttack = 0;
      u.targetMove = 0;
      if (moveDrone(u, homePos, dt)) {
        d.phase = "dock";
        u.speed = 0;
        if (powered) {
          d.battery = Math.min(100, d.battery + 0.25 * dt);
          u.o.hitpoints = Math.min(unitInfo[COMBAT_DRONE].o.hitpoints, u.o.hitpoints + 0.08 * dt);
        }
        if (powered && G.timerGame >= d.restockAt) {
          for (const m of d.members) m.grenades = Math.min(5, m.grenades + 1);
          d.restockAt = G.timerGame + 30;
        }
        if (d.battery >= 99 && u.o.hitpoints >= unitInfo[COMBAT_DRONE].o.hitpoints && powered && d.members.every((m) => m.grenades === 5)) {
          d.phase = "guard";
          u.actionID = ACTION.GUARD;
          d.launchAfter = G.timerGame + 60;
        }
      }
      return true;
    }
    if (G.timerGame < d.launchAfter) return true;
    if (u.actionID === ACTION.STOP) {
      u.targetAttack = 0;
      u.targetMove = 0;
      moveDrone(u, { ...u.o.position }, dt);
      return true;
    }
    if (!droneTargetAllowed(u, u.targetAttack)) {
      if (u.targetMove === u.targetAttack) u.targetMove = 0;
      u.targetAttack = findDroneTarget(u);
    }
    if (u.targetAttack) {
      const position = indexGetTile(u.targetAttack);
      d.phase = home ? "attack" : "orphan";
      if (distance(u.o.position, position) > unitInfo[COMBAT_DRONE].fireDistance * 256 * 0.8) moveDrone(u, position, dt);
      else {
        moveDrone(u, { ...u.o.position }, dt);
        if (G.timerGame >= d.nextFire) {
          const candidates = d.members.slice(0, survivors), offset = Math.floor(G.timerGame / 18) % survivors;
          const member = candidates.slice(offset).concat(candidates.slice(0, offset)).find((m) => m.grenades > 0);
          if (member) {
            member.grenades--;
            G.droneGrenades.push({ from: { x: member.x, y: member.y }, to: { ...position }, released: G.timerGame, impact: G.timerGame + 42, damage: unitInfo[COMBAT_DRONE].damage, origin: indexEncode(u.o.index, 2 /* UNIT */), house: u.o.houseID });
            d.battery = Math.max(0, d.battery - 1.5);
          }
          d.nextFire = G.timerGame + 18;
        }
      }
    } else {
      d.phase = home ? "guard" : "orphan";
      let goal = u.targetMove ? indexGetTile(u.targetMove) : homePos;
      if (u.patrolActive) {
        goal = u.patrolToEnd ? u.patrolEnd : u.patrolStart;
        if (distance(u.o.position, clampDronePoint(u, goal)) < 48) u.patrolToEnd = !u.patrolToEnd;
      }
      moveDrone(u, goal, dt);
    }
    return true;
  } finally {
    updateDroneMembers(u, dt);
  }
}
function laserImpact(u, target) {
  const from = u.o.position, to = indexGetTile(target), steps = Math.max(1, Math.ceil(distance(from, to) / 48));
  const air = indexGetUnit(target);
  if (air && unitInfo[air.o.type].movementType === MOVEMENT.WINGER) return { position: to, blocked: false };
  let last = -1;
  for (let i = 1; i <= steps; i++) {
    const p = { x: Math.round(from.x + (to.x - from.x) * i / steps), y: Math.round(from.y + (to.y - from.y) * i / steps) }, tile2 = packTile(p);
    if (tile2 === last) continue;
    last = tile2;
    const s = structureGetByPackedTile(tile2);
    if (s) return { position: tileCenter(unpackTile(tile2)), blocked: houseAreAllied(u.o.houseID, s.o.houseID) };
    const kind = mapGetLandscapeType(tile2);
    if (kind === LST.ENTIRELY_MOUNTAIN || kind === LST.PARTIAL_MOUNTAIN || kind === LST.WALL) return { position: tileCenter(unpackTile(tile2)), blocked: true };
  }
  return { position: to, blocked: false };
}
function tickLaser(u) {
  if (u.o.type !== LASER_TANK) return;
  if (u.targetAttack && indexIsValid(u.targetAttack)) {
    const target = indexGetTile(u.targetAttack), a = Math.atan2(target.x - u.o.position.x, u.o.position.y - target.y) * 128 / Math.PI;
    unitSetOrientation(u, a, false, 1);
  }
  if (!u.laser?.chargeUntil) return;
  const l = u.laser;
  if (u.actionID === ACTION.DIE || u.o.hitpoints <= 0 || u.targetAttack !== l.target || !indexIsValid(l.target) || u.speed !== 0 || tileGetDistance(u.o.position, indexGetTile(l.target)) > unitInfo[LASER_TANK].fireDistance * 256 || laserImpact(u, l.target).blocked) l.chargeUntil = 0;
}
function fireLaser(u, target) {
  const now = G.timerGame, hit = laserImpact(u, target);
  if (hit.blocked) {
    if (u.laser) u.laser.chargeUntil = 0;
    return 0;
  }
  const l = u.laser ??= { target, chargeStart: now, chargeUntil: 0, cooldownUntil: 0, firedAt: -1e4, from: { ...u.o.position }, to: { ...hit.position } };
  if (now < l.cooldownUntil) return 0;
  if (l.target !== target || l.chargeUntil === 0) {
    l.target = target;
    l.chargeStart = now;
    l.chargeUntil = now + 48;
    return 0;
  }
  if (now < l.chargeUntil) return 0;
  const angle = u.orientation[1].current * Math.PI / 128;
  l.from = { x: u.o.position.x + Math.sin(angle) * 136, y: u.o.position.y - 32 - Math.cos(angle) * 136 };
  const victim = indexGetUnit(target), air = !!victim && unitInfo[victim.o.type].movementType === MOVEMENT.WINGER;
  l.to = { x: hit.position.x, y: hit.position.y - (air ? 48 : 0) };
  l.firedAt = now;
  l.chargeUntil = 0;
  l.cooldownUntil = now + 180;
  const structure = air ? null : structureGetByPackedTile(packTile(hit.position));
  if (structure) {
    structureDamage(structure, Math.round(unitInfo[LASER_TANK].damage * 0.4), 0);
    alertNearbyBaseDefenders(structure, indexEncode(u.o.index, 2 /* UNIT */));
  } else if (victim) {
    unitDamage(victim, laserDamageAgainst(victim.o.type), 0);
    if (victim.o.hitpoints > 0 && unitInfo[victim.o.type].o.actionsPlayer.includes(ACTION.ATTACK) && victim.targetAttack === 0) {
      unitSetAction(victim, ACTION.ATTACK);
      unitSetTarget(victim, indexEncode(u.o.index, 2 /* UNIT */));
    }
  }
  if (air) G.onVisualExplosion(EXPLOSION.IMPACT_SMALL, l.to);
  else mapMakeExplosion(EXPLOSION.IMPACT_MEDIUM, hit.position, 0, indexEncode(u.o.index, 2 /* UNIT */));
  G.onSound(unitInfo[LASER_TANK].bulletSound, u.o.position);
  u.fireDelay = 60;
  return 1;
}
function laserDamageAgainst(type) {
  const m = unitInfo[type].movementType;
  return Math.round(unitInfo[LASER_TANK].damage * (m === MOVEMENT.WINGER ? 1.4 : m === MOVEMENT.WHEELED ? 1.25 : m === MOVEMENT.TRACKED || m === MOVEMENT.HARVESTER ? 0.45 : 1));
}

// web/src/engine/team.ts
var ticks2 = { team: 0 };
function teamResetTimers() {
  ticks2.team = 0;
}
function teamGetByIndex(index) {
  return G.teams[index];
}
function gameLoopTeam() {
  if (ticks2.team > G.timerGame) return;
  const thinkDelay = (random256() & 7) + 5;
  ticks2.team = G.timerGame + Math.max(3, Math.round(thinkDelay * [1.35, 1, 0.8][G.difficulty]));
  G.scriptCurrentObject = null;
  G.scriptCurrentUnit = null;
  G.scriptCurrentStructure = null;
  const find = findAll();
  for (; ; ) {
    const t = teamFind(find);
    if (!t) break;
    const h = G.houses[t.houseID];
    G.scriptCurrentTeam = t;
    if (!h.flags.isAIActive) continue;
    if (t.script.delay !== 0) {
      t.script.delay--;
      continue;
    }
    if (!scriptIsLoaded(t.script)) continue;
    if (!scriptRun(t.script)) break;
  }
}
function teamCreate(houseID, teamActionType, movementType, minMembers, maxMembers) {
  const t = teamAllocate(INDEX_INVALID);
  if (!t) return null;
  t.flags.used = true;
  t.houseID = houseID;
  t.action = teamActionType;
  t.actionStart = teamActionType;
  t.movementType = movementType;
  t.minMembers = minMembers;
  t.maxMembers = maxMembers;
  scriptReset(t.script, G.scriptTeam);
  scriptLoad(t.script, teamActionType);
  t.script.delay = 0;
  return t;
}

// web/src/engine/unit.ts
var FUNCTIONS = [
  [0, 1, 0],
  [2, 3, 0],
  [0, 1, 0]
];
var ticks3 = { movement: 0, rotation: 0, blinking: 0, unknown4: 0, script: 0, unknown5: 0, deviation: 0 };
function unitResetTimers() {
  for (const k of Object.keys(ticks3)) ticks3[k] = 0;
}
function unitGetHouseID(u) {
  if (u.deviated !== 0) return HOUSE.ORDOS;
  return u.o.houseID;
}
function unitRotate(unit, level) {
  const o = unit.orientation[level];
  if (o.speed === 0) return;
  const target = o.target;
  const current = o.current;
  let diff = target - current;
  if (diff > 128) diff -= 256;
  if (diff < -128) diff += 256;
  diff = Math.abs(diff);
  let newCurrent = s8(current + o.speed);
  if (Math.abs(o.speed) >= diff) {
    o.speed = 0;
    newCurrent = target;
  }
  o.current = newCurrent;
  if (orientation16(newCurrent) === orientation16(current) && orientation8(newCurrent) === orientation8(current)) return;
  unitSpriteUpdate(unit);
  unitUpdateMap(2, unit);
}
function unitSpriteUpdate(unit) {
  if (!unit.recoil) unit.recoilShown = false;
}
function unitMovementTick(unit) {
  if (unit.speed === 0) return;
  let speed = unit.speedRemainder;
  if (unitInfo[unit.o.type].movementType !== MOVEMENT.WINGER) speed += adjustToGameSpeed(unit.speedPerTick, 1, 255, false);
  else speed += unit.speedPerTick;
  if ((speed & 65280) !== 0) {
    unitMove(unit, Math.min(unit.speed * 16, tileGetDistance(unit.o.position, unit.currentDestination) + 16) * carryallMovementScale(unit));
  }
  unit.speedRemainder = speed & 255;
}
function unitPatrolTick(unit) {
  const ui = unitInfo[unit.o.type];
  if (!ui.o.actionsPlayer.includes(ACTION.ATTACK) || !ui.o.actionsPlayer.includes(ACTION.MOVE)) {
    unit.patrolActive = false;
    return;
  }
  if (unit.patrolEngaging) {
    const target = indexGetUnit(unit.targetAttack);
    if (target?.o.flags.allocated && !target.o.flags.isNotOnMap && !houseAreAllied(unitGetHouseID(unit), unitGetHouseID(target))) {
      if (unit.actionID !== ACTION.ATTACK && unit.currentDestination.x === 0 && unit.currentDestination.y === 0) unitSetAction(unit, ACTION.ATTACK);
      return;
    }
    unit.patrolEngaging = false;
    unit.targetAttack = 0;
    unit.targetMove = 0;
    unit.route[0] = 255;
    unit.currentDestination = { x: 0, y: 0 };
    unitSetSpeed(unit, 0);
    unitSetAction(unit, ACTION.MOVE);
    const resume = unit.patrolToEnd ? unit.patrolEnd : unit.patrolStart;
    unitSetDestination(unit, indexEncode(packTile(resume), 1 /* TILE */));
  }
  if (!unit.patrolEngaging) {
    let nearest = null;
    let nearestDistance = 5 * 256;
    for (const enemy of G.units) {
      if (!enemy.o.flags.allocated || enemy.o.flags.isNotOnMap || enemy === unit) continue;
      if (houseAreAllied(unitGetHouseID(unit), unitGetHouseID(enemy))) continue;
      if ((enemy.o.seenByHouses & 1 << G.playerHouseID) === 0) continue;
      const distance2 = tileGetDistance(unit.o.position, enemy.o.position);
      if (distance2 < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance2;
      }
    }
    if (nearest) {
      unit.targetAttack = 0;
      unit.targetMove = 0;
      unit.route[0] = 255;
      unit.currentDestination = { x: 0, y: 0 };
      unitSetSpeed(unit, 0);
      unitSetAction(unit, ACTION.ATTACK);
      unitSetTarget(unit, indexEncode(nearest.o.index, 2 /* UNIT */));
      unit.patrolEngaging = true;
      return;
    }
  }
  if (unit.targetMove === 0 && unit.speed === 0 && unit.currentDestination.x === 0 && unit.currentDestination.y === 0) {
    unit.patrolToEnd = !unit.patrolToEnd;
    const destination = unit.patrolToEnd ? unit.patrolEnd : unit.patrolStart;
    if (unit.actionID !== ACTION.MOVE) unitSetAction(unit, ACTION.MOVE);
    unitSetDestination(unit, indexEncode(packTile(destination), 1 /* TILE */));
  }
}
function gameLoopUnit() {
  tickDroneGrenades();
  let tickMovement = false;
  let tickRotation = false;
  let tickBlinking = false;
  let tickUnknown4 = false;
  let tickScript = false;
  let tickUnknown5 = false;
  let tickDeviation = false;
  const now = G.timerGame;
  if (ticks3.movement <= now) {
    tickMovement = true;
    ticks3.movement = now + 3;
  }
  if (ticks3.rotation <= now) {
    tickRotation = true;
    ticks3.rotation = now + 2;
  }
  if (ticks3.blinking <= now) {
    tickBlinking = true;
    ticks3.blinking = now + 3;
  }
  if (ticks3.unknown4 <= now) {
    tickUnknown4 = true;
    ticks3.unknown4 = now + 20;
  }
  if (ticks3.script <= now) {
    tickScript = true;
    ticks3.script = now + 5;
  }
  if (ticks3.unknown5 <= now) {
    tickUnknown5 = true;
    ticks3.unknown5 = now + 5;
  }
  if (ticks3.deviation <= now) {
    tickDeviation = true;
    ticks3.deviation = now + 60;
  }
  const find = findAll();
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    const ui = unitInfo[u.o.type];
    G.scriptCurrentObject = u.o;
    G.scriptCurrentStructure = null;
    G.scriptCurrentUnit = u;
    G.scriptCurrentTeam = null;
    if (u.o.flags.isNotOnMap) continue;
    tickCarryallFlight(u);
    if (tickDrone(u)) continue;
    tickLaser(u);
    if (u.harvesterDefense && tickScript) unitHarvesterDefenseTick(u);
    if (tickUnknown4 && u.targetAttack !== 0 && ui.o.flags.hasTurret) {
      unitSetOrientation(u, tileGetDirection(u.o.position, indexGetTile(u.targetAttack)), false, 1);
      unitSpriteUpdate(u);
      u.recoil = false;
    }
    if (tickMovement) {
      unitMovementTick(u);
      if (u.fireDelay !== 0) {
        if (ui.movementType === MOVEMENT.WINGER && !ui.flags.isNormalUnit) {
          let t = u.currentDestination;
          const tu = indexGetUnit(u.targetAttack);
          if (tu && unitInfo[tu.o.type].movementType === MOVEMENT.WINGER) t = indexGetTile(u.targetAttack);
          unitSetOrientation(u, tileGetDirection(u.o.position, t), false, 0);
        }
        u.fireDelay--;
      }
    }
    if (tickRotation) {
      unitRotate(u, 0);
      if (ui.o.flags.hasTurret) unitRotate(u, 1);
      unitSpriteUpdate(u);
      u.recoil = false;
    }
    if (tickBlinking && u.blinkCounter !== 0) {
      u.blinkCounter--;
      u.o.flags.isHighlighted = u.blinkCounter % 2 !== 0;
      unitUpdateMap(2, u);
    }
    if (tickDeviation) unitDeviationDecrease(u, 1);
    if (ui.movementType !== MOVEMENT.WINGER && objectGetByPackedTile(packTile(u.o.position)) === null) unitUpdateMap(1, u);
    if (tickUnknown5) {
      if (u.timer === 0) {
        if (ui.movementType === MOVEMENT.FOOT && u.speed !== 0 || u.o.flags.isSmoking) {
          if (u.spriteOffset >= 0) {
            u.spriteOffset &= 63;
            u.spriteOffset++;
            unitUpdateMap(2, u);
            u.timer = idiv(ui.animationSpeed, 5);
            if (u.o.flags.isSmoking) {
              u.timer = 3;
              if (u.spriteOffset > 32) {
                u.o.flags.isSmoking = false;
                u.spriteOffset = 0;
              }
            }
          }
        }
        if (u.o.type === UNIT.ORNITHOPTER && u.o.flags.allocated && u.spriteOffset >= 0) {
          u.spriteOffset &= 63;
          u.spriteOffset++;
          unitUpdateMap(2, u);
          u.timer = 1;
        }
        if (u.o.type === UNIT.HARVESTER) {
          if (u.actionID === ACTION.HARVEST || u.o.flags.isSmoking) {
            u.spriteOffset &= 63;
            u.spriteOffset++;
            unitUpdateMap(2, u);
            u.timer = 4;
          } else if (u.spriteOffset !== 0) {
            unitUpdateMap(2, u);
            u.spriteOffset = 0;
          }
        }
      } else {
        u.timer--;
      }
    }
    if (tickScript) {
      if (u.patrolActive) unitPatrolTick(u);
      if (u.o.script.delay === 0) {
        if (scriptIsLoaded(u.o.script)) {
          let opcodesLeft = OPCODES_PER_TICK + 2;
          if (!ui.o.flags.scriptNoSlowdown && !mapIsPositionInViewport(u.o.position)) opcodesLeft = 3;
          u.o.script.variables[3] = G.playerHouseID;
          for (; opcodesLeft > 0 && u.o.script.delay === 0; opcodesLeft--) {
            if (!scriptRun(u.o.script)) break;
          }
        }
      } else {
        u.o.script.delay--;
      }
    }
    if (u.nextActionID === ACTION.INVALID) continue;
    if (u.currentDestination.x !== 0 || u.currentDestination.y !== 0) continue;
    unitSetAction(u, u.nextActionID);
    u.nextActionID = ACTION.INVALID;
  }
}
function unitCreate(index, typeID, houseID, position, orientation) {
  if (houseID >= 6) return null;
  if (typeID >= UNIT.MAX) return null;
  const ui = unitInfo[typeID];
  const u = unitAllocate(index, typeID, houseID);
  if (!u) return null;
  u.o.houseID = houseID;
  u.carryallFlight = void 0;
  unitSetOrientation(u, orientation, true, 0);
  unitSetOrientation(u, orientation, true, 1);
  unitSetSpeed(u, 0);
  u.o.position = { ...position };
  u.o.hitpoints = ui.o.hitpoints;
  u.currentDestination = { x: 0, y: 0 };
  u.originEncoded = 0;
  u.route[0] = 255;
  if (position.x !== 65535 || position.y !== 65535) {
    u.originEncoded = unitFindClosestRefinery(u);
    u.targetLast = { ...position };
    u.targetPreLast = { ...position };
  }
  u.o.linkedID = 255;
  u.o.script.delay = 0;
  u.actionID = ACTION.GUARD;
  u.nextActionID = ACTION.INVALID;
  u.fireDelay = 0;
  u.distanceToDestination = 32767;
  u.targetMove = 0;
  u.amount = 0;
  u.harvesterDefense = void 0;
  u.laser = void 0;
  u.drone = void 0;
  u.wobbleIndex = 0;
  u.spriteOffset = 0;
  u.blinkCounter = 0;
  u.timer = 0;
  scriptReset(u.o.script, G.scriptUnit);
  u.o.flags.allocated = true;
  if (ui.movementType === MOVEMENT.TRACKED) {
    if (random256() < houseInfo[houseID].degradingChance) u.o.flags.degrades = true;
  }
  if (ui.movementType === MOVEMENT.WINGER) {
    unitSetSpeed(u, 255);
  } else if ((position.x !== 65535 || position.y !== 65535) && unitIsTileOccupied(u)) {
    unitFree(u);
    return null;
  }
  if (position.x === 65535 && position.y === 65535) {
    u.o.flags.isNotOnMap = true;
    return u;
  }
  unitUpdateMap(1, u);
  unitSetAction(u, houseID === G.playerHouseID ? ui.o.actionsPlayer[3] : ui.actionAI);
  return u;
}
function unitIsTypeOnMap(houseID, typeID) {
  for (const u of G.unitFind) {
    if (houseID !== HOUSE_INVALID && unitGetHouseID(u) !== houseID) continue;
    if (typeID !== UNIT.INVALID && u.o.type !== typeID) continue;
    if (G.validateStrictIfZero === 0 && u.o.flags.isNotOnMap) continue;
    return true;
  }
  return false;
}
function unitHarvesterDefend(u, attacker) {
  if (u.o.type !== UNIT.HARVESTER || !u.o.flags.allocated || u.o.hitpoints === 0 || u.o.flags.isNotOnMap || !attacker.o.flags.allocated || attacker.o.hitpoints === 0 || attacker.o.flags.isNotOnMap || unitInfo[attacker.o.type].movementType !== MOVEMENT.FOOT || houseAreAllied(unitGetHouseID(u), unitGetHouseID(attacker)) || tileGetDistance(u.o.position, attacker.o.position) > 4 * 256) return false;
  if (u.harvesterDefense) return true;
  if (u.actionID !== ACTION.HARVEST && u.actionID !== ACTION.GUARD && u.actionID !== ACTION.STOP) return false;
  let spice = { ...u.targetLast };
  if (indexGetType(u.targetMove) === 1 /* TILE */) spice = indexGetTile(u.targetMove);
  const kind = mapGetLandscapeType(packTile(spice));
  if (kind !== LST.SPICE && kind !== LST.THICK_SPICE) spice = { ...u.o.position };
  const target = indexEncode(attacker.o.index, 2 /* UNIT */);
  const defense = { target, spice: { ...spice }, start: { ...u.o.position }, expires: G.timerGame + 960 };
  objectScriptVariable4Clear(u.o);
  u.targetAttack = 0;
  u.targetMove = 0;
  unitSetAction(u, ACTION.MOVE);
  unitSetDestination(u, target);
  u.harvesterDefense = defense;
  return true;
}
function unitHarvesterDefenseTick(u) {
  const defense = u.harvesterDefense;
  if (u.actionID === ACTION.DIE || u.actionID === ACTION.RETURN || u.actionID === ACTION.RETREAT) {
    u.harvesterDefense = void 0;
    return;
  }
  const attacker = indexGetUnit(defense.target);
  if (attacker?.o.flags.allocated && attacker.o.hitpoints > 0 && attacker.actionID !== ACTION.DIE && !attacker.o.flags.isNotOnMap && !houseAreAllied(unitGetHouseID(u), unitGetHouseID(attacker)) && unitInfo[attacker.o.type].movementType === MOVEMENT.FOOT && G.timerGame < defense.expires && tileGetDistance(attacker.o.position, defense.start) <= 4 * 256) {
    if (u.actionID !== ACTION.MOVE) unitSetAction(u, ACTION.MOVE);
    if (u.targetMove !== defense.target) unitSetDestination(u, defense.target);
    return;
  }
  u.harvesterDefense = void 0;
  u.targetAttack = 0;
  u.targetMove = 0;
  u.route[0] = 255;
  const oldField = packTile(defense.spice), kind = mapGetLandscapeType(oldField);
  const field = kind === LST.SPICE || kind === LST.THICK_SPICE ? oldField : mapSearchSpice(packTile(u.o.position), 64);
  unitSetAction(u, ACTION.HARVEST);
  if (field) {
    u.targetLast = tileCenter(unpackTile(field));
    unitSetDestination(u, indexEncode(field, 1 /* TILE */));
  }
}
function unitSetAction(u, action) {
  if (!u) return;
  action &= 255;
  if (u.actionID === ACTION.DESTRUCT || u.actionID === ACTION.DIE || action === ACTION.INVALID) return;
  const ai = actionInfo[action];
  if (!ai) return;
  if (ai.switchType === 0 && (u.currentDestination.x !== 0 || u.currentDestination.y !== 0)) {
    u.nextActionID = action;
    return;
  }
  switch (ai.switchType) {
    case 0:
    case 1:
      u.actionID = action;
      u.nextActionID = ACTION.INVALID;
      u.currentDestination = { x: 0, y: 0 };
      u.o.script.delay = 0;
      scriptReset(u.o.script, G.scriptUnit);
      u.o.script.variables[0] = action;
      scriptLoad(u.o.script, u.o.type);
      return;
    case 2:
      u.o.script.variables[0] = action;
      scriptLoadAsSubroutine(u.o.script, u.o.type);
      return;
    default:
      return;
  }
}
function unitAddToTeam(u, t) {
  if (!t || !u) return 0;
  u.team = t.index + 1;
  t.members++;
  return u16(t.maxMembers - t.members);
}
function unitRemoveFromTeam(u) {
  if (!u || u.team === 0) return 0;
  const t = teamGetByIndex(u.team - 1);
  t.members--;
  u.team = 0;
  return u16(t.maxMembers - t.members);
}
function unitGetTeam(u) {
  if (!u || u.team === 0) return null;
  return teamGetByIndex(u.team - 1);
}
function unitSort() {
  const h = G.houses[G.playerHouseID];
  h.unitCountEnemy = 0;
  h.unitCountAllied = 0;
  const arr2 = G.unitFind;
  for (let i = 0; i < arr2.length - 1; i++) {
    const u1 = arr2[i];
    const u2 = arr2[i + 1];
    let y1 = u1.o.position.y;
    let y2 = u2.o.position.y;
    if (unitInfo[u1.o.type].movementType === MOVEMENT.FOOT) y1 = u16(y1 - 256);
    if (unitInfo[u2.o.type].movementType === MOVEMENT.FOOT) y2 = u16(y2 - 256);
    if (s16(y1) > s16(y2)) {
      arr2[i] = u2;
      arr2[i + 1] = u1;
    }
  }
  for (const u of arr2) {
    if ((u.o.seenByHouses & 1 << G.playerHouseID) !== 0 && !u.o.flags.isNotOnMap) {
      if (houseAreAllied(u.o.houseID, G.playerHouseID)) h.unitCountAllied++;
      else h.unitCountEnemy++;
    }
  }
}
function unitGetByPackedTile(packed) {
  if (isOutOfMap(packed)) return null;
  const t = G.map[packed];
  if (!t.hasUnit) return null;
  return G.units[t.index - 1] ?? null;
}
function unitIsValidMovementIntoStructure(unit, s) {
  if (!unit || !s) return 0;
  const si = structureInfo[s.o.type];
  const ui = unitInfo[unit.o.type];
  const unitEnc = indexEncode(unit.o.index, 2 /* UNIT */);
  const structEnc = indexEncode(s.o.index, 3 /* STRUCTURE */);
  if (unitGetHouseID(unit) !== s.o.houseID) {
    if (unit.o.type === UNIT.SABOTEUR && unit.targetMove === structEnc) return 2;
    if (ui.movementType === MOVEMENT.FOOT && si.o.flags.conquerable) return unit.targetMove === structEnc ? 2 : 1;
    return 0;
  }
  if ((si.enterFilter & 1 << unit.o.type) === 0) return 0;
  if (s.o.script.variables[4] === unitEnc) return 2;
  return s.o.linkedID === 255 ? 1 : 0;
}
function unitSetDestination(u, destination) {
  if (!u) return;
  if (!indexIsValid(destination)) return;
  if (u.targetMove === destination) return;
  if (indexGetType(destination) === 1 /* TILE */) {
    const packed = indexDecode(destination);
    const u2 = unitGetByPackedTile(packed);
    if (u2) {
      if (u !== u2) destination = indexEncode(u2.o.index, 2 /* UNIT */);
    } else {
      const s2 = structureGetByPackedTile(packed);
      if (s2) destination = indexEncode(s2.o.index, 3 /* STRUCTURE */);
    }
  }
  const s = indexGetStructure(destination);
  if (s && s.o.houseID === unitGetHouseID(u)) {
    if (unitIsValidMovementIntoStructure(u, s) === 1 || unitInfo[u.o.type].movementType === MOVEMENT.WINGER) {
      objectScriptVariable4Link(indexEncode(u.o.index, 2 /* UNIT */), destination);
    }
  }
  u.targetMove = destination;
  u.route[0] = 255;
}
function unitDestinationTile(u, encoded) {
  if (u.o.type === UNIT.CARRYALL) return carryallDestination(encoded);
  const s = indexGetStructure(encoded);
  return u.o.type === UNIT.HARVESTER && s?.o.type === STRUCTURE.REFINERY && s.o.houseID === unitGetHouseID(u) ? refineryDock(s.o.position) : indexGetTile(encoded);
}
function unitGetTargetUnitPriority(unit, target) {
  if (!unit || !target) return 0;
  if (unit === target) return 0;
  if (!target.o.flags.allocated) return 0;
  if ((target.o.seenByHouses & 1 << unitGetHouseID(unit)) === 0) return 0;
  if (houseAreAllied(unitGetHouseID(unit), unitGetHouseID(target))) return 0;
  const ui = unitInfo[unit.o.type];
  const ti = unitInfo[target.o.type];
  if (!ti.o.flags.priority) return 0;
  if (ti.movementType === MOVEMENT.WINGER) {
    if (!ui.o.flags.targetAir) return 0;
    if (target.o.houseID === G.playerHouseID && !mapIsPositionUnveiled(packTile(target.o.position))) return 0;
  }
  if (!mapIsValidPosition(packTile(target.o.position))) return 0;
  const distance2 = tileGetDistanceRoundedUp(unit.o.position, target.o.position);
  if (!mapIsValidPosition(packTile(unit.o.position))) {
    if (ti.fireDistance >= distance2) return 0;
  }
  let priority = u16(ti.o.priorityTarget + ti.o.priorityBuild);
  if (distance2 !== 0) priority = idiv(priority, distance2) + 1;
  if (priority > 32e3) return 32e3;
  return priority;
}
function unitFindClosestRefinery(unit) {
  const res = unit.originEncoded === 0 ? 0 : 1;
  if (unit.o.type !== UNIT.HARVESTER) {
    unit.originEncoded = indexEncode(packTile(unit.o.position), 1 /* TILE */);
    return res;
  }
  let s = null;
  let mind = 0;
  let find = findAll(unitGetHouseID(unit), STRUCTURE.REFINERY);
  for (; ; ) {
    const s2 = structureFind(find);
    if (!s2) break;
    if (s2.state !== 1) continue;
    const d = tileGetDistance(unit.o.position, s2.o.position);
    if (mind !== 0 && d >= mind) continue;
    mind = d;
    s = s2;
  }
  if (!s) {
    find = findAll(unitGetHouseID(unit), STRUCTURE.REFINERY);
    for (; ; ) {
      const s2 = structureFind(find);
      if (!s2) break;
      const d = tileGetDistance(unit.o.position, s2.o.position);
      if (mind !== 0 && d >= mind) continue;
      mind = d;
      s = s2;
    }
  }
  if (s) unit.originEncoded = indexEncode(s.o.index, 3 /* STRUCTURE */);
  return res;
}
function unitSetPosition(u, position) {
  if (!u) return false;
  const ui = unitInfo[u.o.type];
  u.o.flags.isNotOnMap = false;
  u.o.position = tileCenter(position);
  if (u.originEncoded === 0) unitFindClosestRefinery(u);
  u.o.script.variables[4] = 0;
  if (unitIsTileOccupied(u)) {
    u.o.flags.isNotOnMap = true;
    return false;
  }
  u.currentDestination = { x: 0, y: 0 };
  u.targetMove = 0;
  u.targetAttack = 0;
  if (G.map[packTile(u.o.position)].isUnveiled) {
    u.o.seenByHouses &= ~(1 << u.o.houseID);
    unitHouseUnitCountAdd(u, G.playerHouseID);
  }
  if (u.o.houseID !== G.playerHouseID || u.o.type === UNIT.HARVESTER || u.o.type === UNIT.SABOTEUR) unitSetAction(u, ui.actionAI);
  else unitSetAction(u, ui.o.actionsPlayer[3]);
  u.spriteOffset = 0;
  unitUpdateMap(1, u);
  return true;
}
function unitRemove(u) {
  if (!u) return;
  u.o.flags.allocated = true;
  unitUntargetMe(u);
  if (u === G.unitSelected) unitSelect(null);
  u.o.flags.bulletIsBig = true;
  unitUpdateMap(0, u);
  unitHouseUnitCountRemove(u);
  scriptReset(u.o.script, G.scriptUnit);
  unitFree(u);
}
function unitFindBestTargetUnit(u, mode) {
  if (!u) return null;
  let position = u.o.position;
  if (u.originEncoded === 0) u.originEncoded = indexEncode(packTile(position), 1 /* TILE */);
  else position = indexGetTile(u.originEncoded);
  let distance2 = u16(unitInfo[u.o.type].fireDistance << 8);
  if (mode === 2) distance2 = u16(distance2 << 1);
  let best = null;
  let bestPriority = 0;
  const find = findAll();
  for (; ; ) {
    const target = unitFind(find, unitGetHouseID);
    if (!target) break;
    if (mode !== 0 && mode !== 4) {
      if (mode === 1 && tileGetDistance(u.o.position, target.o.position) > distance2) continue;
      if (mode === 2 && tileGetDistance(position, target.o.position) > distance2) continue;
    }
    const priority = unitGetTargetUnitPriority(u, target);
    if (s16(priority) > s16(bestPriority)) {
      best = target;
      bestPriority = priority;
    }
  }
  if (bestPriority === 0) return null;
  return best;
}
function unitSandwormGetTargetPriority(unit, target) {
  if (!unit || !target) return 0;
  if (!mapIsPositionUnveiled(packTile(target.o.position))) return 0;
  if (!landscapeInfo[mapGetLandscapeType(packTile(target.o.position))].isSand) return 0;
  let res;
  switch (unitInfo[target.o.type].movementType) {
    case MOVEMENT.FOOT:
      res = 100;
      break;
    case MOVEMENT.TRACKED:
      res = 1e3;
      break;
    case MOVEMENT.HARVESTER:
      res = 1e3;
      break;
    case MOVEMENT.WHEELED:
      res = 5e3;
      break;
    default:
      res = 0;
      break;
  }
  if (target.speed !== 0 || target.fireDelay !== 0) res = u16(res * 4);
  const distance2 = tileGetDistanceRoundedUp(unit.o.position, target.o.position);
  if (distance2 !== 0 && res !== 0) res = idiv(res, distance2);
  if (distance2 < 2) res = u16(res * 2);
  return res;
}
function unitSandwormFindBestTarget(unit) {
  if (!unit) return null;
  let best = null;
  let bestPriority = 0;
  const find = findAll();
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    const priority = unitSandwormGetTargetPriority(unit, u);
    if (priority >= bestPriority) {
      best = u;
      bestPriority = priority;
    }
  }
  if (bestPriority === 0) return null;
  return best;
}
function unitStartMovement(unit) {
  if (!unit) return false;
  const ui = unitInfo[unit.o.type];
  const orientation = s8(unit.orientation[0].current + 16 & 224);
  unitSetOrientation(unit, orientation, true, 0);
  unitSetOrientation(unit, orientation, false, 1);
  const position = tileMoveByOrientation(unit.o.position, orientation);
  const packed = packTile(position);
  unit.distanceToDestination = 32767;
  const score = unitGetTileEnterScore(unit, packed, idiv(orientation, 32));
  if (score > 255 || score === -1) return false;
  let type = mapGetLandscapeType(packed);
  if (type === LST.STRUCTURE) type = LST.CONCRETE_SLAB;
  let speed = landscapeInfo[type].movementSpeed[ui.movementType];
  if (unit.o.type === UNIT.SABOTEUR && type === LST.WALL) speed = 255;
  unit.o.flags.isSmoking = false;
  if (landscapeInfo[type].letUnitWobble) unit.o.flags.isWobbling = true;
  if (idiv(ui.o.hitpoints, 2) > unit.o.hitpoints && ui.movementType !== MOVEMENT.WINGER) speed -= idiv(speed, 4);
  unitSetSpeed(unit, speed);
  if (ui.movementType !== MOVEMENT.SLITHER) {
    const positionOld = unit.o.position;
    unit.o.position = position;
    unitUpdateMap(1, unit);
    unit.o.position = positionOld;
  }
  unit.currentDestination = position;
  unitDeviationDecrease(unit, 10);
  return true;
}
function unitSetTarget(unit, encoded) {
  if (!unit || !indexIsValid(encoded)) return;
  if (unit.targetAttack === encoded) return;
  if (indexGetType(encoded) === 1 /* TILE */) {
    const packed = indexDecode(encoded);
    const u = unitGetByPackedTile(packed);
    if (u) encoded = indexEncode(u.o.index, 2 /* UNIT */);
    else {
      const s = structureGetByPackedTile(packed);
      if (s) encoded = indexEncode(s.o.index, 3 /* STRUCTURE */);
    }
  }
  if (indexEncode(unit.o.index, 2 /* UNIT */) === encoded) encoded = indexEncode(packTile(unit.o.position), 1 /* TILE */);
  unit.targetAttack = encoded;
  if (!unitInfo[unit.o.type].o.flags.hasTurret) {
    unit.targetMove = encoded;
    unit.route[0] = 255;
  }
}
function unitDeviationDecrease(unit, amount) {
  if (!unit || unit.deviated === 0) return false;
  const ui = unitInfo[unit.o.type];
  if (!ui.flags.isNormalUnit) return false;
  if (amount === 0) amount = houseInfo[unit.o.houseID].toughness;
  if (unit.deviated > amount) {
    unit.deviated -= amount;
    return false;
  }
  unit.deviated = 0;
  unit.o.flags.bulletIsBig = true;
  unitUpdateMap(2, unit);
  unit.o.flags.bulletIsBig = false;
  if (unit.o.houseID === G.playerHouseID) unitSetAction(unit, ui.o.actionsPlayer[3]);
  else unitSetAction(unit, ui.actionAI);
  unitUntargetMe(unit);
  unit.targetAttack = 0;
  unit.targetMove = 0;
  return true;
}
function unitRemoveFog(unit) {
  if (!unit) return;
  if (unit.o.flags.isNotOnMap) return;
  const p = unit.o.position;
  if (p.x === 65535 && p.y === 65535 || p.x === 0 && p.y === 0) return;
  if (!houseAreAllied(unitGetHouseID(unit), G.playerHouseID)) return;
  const r = unitInfo[unit.o.type].o.fogUncoverRadius;
  if (r === 0) return;
  tileRemoveFogInRadius(unit.o.position, r);
}
function unitDeviate(unit, probability, houseID) {
  if (!unit) return false;
  const ui = unitInfo[unit.o.type];
  if (!ui.flags.isNormalUnit) return false;
  if (unit.deviated !== 0) return false;
  if (ui.flags.isNotDeviatable) return false;
  if (probability === 0) probability = houseInfo[unit.o.houseID].toughness;
  if (unit.o.houseID !== G.playerHouseID) probability -= idiv(probability, 8);
  if (random256() >= probability) return false;
  unit.deviated = 120;
  unit.deviatedHouse = houseID;
  unitUpdateMap(2, unit);
  if (G.playerHouseID === unit.deviatedHouse) unitSetAction(unit, ui.o.actionsPlayer[3]);
  else unitSetAction(unit, ui.actionAI);
  unitUntargetMe(unit);
  unit.targetAttack = 0;
  unit.targetMove = 0;
  return true;
}
var HOUSE_MISSILE_X = [0, 0, 200, 256, 200, 0, -200, -256, -200, 0, 400, 512, 400, 0, -400, -512, -400];
var HOUSE_MISSILE_Y = [0, -256, -200, 0, 200, 256, 200, 0, -200, -512, -400, 0, 400, 512, 400, 0, -400];
function unitMove(unit, distance2) {
  if (!unit || !unit.o.flags.used) return false;
  const ui = unitInfo[unit.o.type];
  let newPosition = tileMoveByDirection(unit.o.position, unit.orientation[0].current, distance2);
  if (newPosition.x === unit.o.position.x && newPosition.y === unit.o.position.y) return false;
  if (!tileIsValid(newPosition)) {
    if (!ui.flags.mustStayInMap) {
      unitRemove(unit);
      return true;
    }
    if (unit.o.flags.byScenario && unit.o.linkedID === 255 && unit.o.script.variables[4] === 0) {
      unitRemove(unit);
      return true;
    }
    newPosition = { ...unit.o.position };
    unitSetOrientation(unit, unit.orientation[0].current + (random256() & 15), false, 0);
  }
  unit.wobbleIndex = 0;
  if (ui.flags.canWobble && unit.o.flags.isWobbling) unit.wobbleIndex = random256() & 7;
  const d = tileGetDistance(newPosition, unit.currentDestination);
  const packed = packTile(newPosition);
  if (ui.flags.isTracked && d < 48) {
    const u = unitGetByPackedTile(packed);
    if (u && unitInfo[u.o.type].movementType === MOVEMENT.FOOT && u.o.flags.allocated) {
      if (u === G.unitSelected) unitSelect(null);
      unitUntargetMe(u);
      u.o.script.variables[1] = 1;
      unitSetAction(u, ACTION.DIE);
    }
  }
  unitUpdateMap(0, unit);
  if (ui.movementType === MOVEMENT.WINGER) unit.o.flags.animationFlip = !unit.o.flags.animationFlip;
  const currentDestination = unit.currentDestination;
  distance2 = tileGetDistance(newPosition, currentDestination);
  let ret;
  let isSpiceBloom = false;
  if (unit.o.type === UNIT.SONIC_BLAST) {
    const damage = idiv(unit.o.hitpoints, 4) + 1;
    ret = false;
    const u = unitGetByPackedTile(packed);
    if (u) {
      if (!unitInfo[u.o.type].flags.sonicProtection) unitDamage(u, damage, 0);
    } else {
      const s = structureGetByPackedTile(packed);
      if (s) structureDamage(s, damage, 0);
      else if (mapGetLandscapeType(packed) === LST.WALL && structureInfo[STRUCTURE.WALL].o.hitpoints > damage) random256();
    }
    if (unit.o.hitpoints < idiv(ui.damage, 2)) unit.o.flags.bulletIsBig = true;
    unit.o.hitpoints = u16(unit.o.hitpoints - 1);
    if (unit.o.hitpoints === 0 || unit.fireDelay === 0) unitRemove(unit);
  } else {
    if (unit.o.type === UNIT.BULLET) {
      let type = mapGetLandscapeType(packTile(newPosition));
      if (type === LST.WALL || type === LST.STRUCTURE) {
        if (indexGetType(unit.originEncoded) === 3 /* STRUCTURE */) {
          if (G.map[packTile(newPosition)].houseID === unit.o.houseID) type = LST.NORMAL_SAND;
        }
      }
      if (type === LST.WALL || type === LST.STRUCTURE || type === LST.ENTIRELY_MOUNTAIN) {
        unit.o.position = newPosition;
        mapMakeExplosion(ui.explosionType + idiv(unit.o.hitpoints, 10) & 3, unit.o.position, unit.o.hitpoints, unit.originEncoded);
        unitRemove(unit);
        return true;
      }
    }
    ret = unit.distanceToDestination < distance2 || distance2 < 16;
    if (ret) {
      if (ui.flags.isBullet) {
        if (unit.fireDelay === 0 || unit.o.type === UNIT.MISSILE_TURRET) {
          if (unit.o.type === UNIT.MISSILE_HOUSE) {
            for (let i = 0; i < 17; i++) {
              const p = tile(newPosition.x + HOUSE_MISSILE_X[i], newPosition.y + HOUSE_MISSILE_Y[i]);
              if (tileIsValid(p)) mapMakeExplosion(ui.explosionType, p, 200, 0);
            }
          } else if (ui.explosionType !== 65535) {
            const pp = packTile(unit.o.position);
            if (ui.flags.impactOnSand && G.map[pp].index === 0 && mapGetLandscapeType(pp) === LST.NORMAL_SAND) {
              mapMakeExplosion(EXPLOSION.SAND_BURST, newPosition, unit.o.hitpoints, unit.originEncoded);
            } else if (unit.o.type === UNIT.MISSILE_DEVIATOR) {
              mapDeviateArea(ui.explosionType, newPosition, 32, unit.o.houseID);
            } else {
              mapMakeExplosion(ui.explosionType + idiv(unit.o.hitpoints, 20) & 3, newPosition, unit.o.hitpoints, unit.originEncoded);
            }
          }
          unitRemove(unit);
          return true;
        }
      } else if (ui.flags.isGroundUnit) {
        if (currentDestination.x !== 0 || currentDestination.y !== 0) newPosition = { ...currentDestination };
        unit.targetPreLast = unit.targetLast;
        unit.targetLast = { ...unit.o.position };
        unit.currentDestination = { x: 0, y: 0 };
        if (unit.o.flags.degrades && (random256() & 3) === 0) unitDamage(unit, 1, 0);
        if (unit.o.type === UNIT.SABOTEUR) {
          let detonate = mapGetLandscapeType(packTile(newPosition)) === LST.WALL;
          if (!detonate) detonate = unit.targetMove !== 0 && tileGetDistance(unit.o.position, indexGetTile(unit.targetMove)) < 32;
          if (detonate) {
            mapMakeExplosion(EXPLOSION.SABOTEUR_DEATH, newPosition, 500, 0);
            unitRemove(unit);
            return true;
          }
        }
        unitSetSpeed(unit, 0);
        if (unit.targetMove === indexEncode(packed, 1 /* TILE */)) unit.targetMove = 0;
        const s = structureGetByPackedTile(packed);
        if (s) {
          unit.targetPreLast = { x: 0, y: 0 };
          unit.targetLast = { x: 0, y: 0 };
          unitEnterStructure(unit, s);
          return true;
        }
        if (unit.o.type !== UNIT.SANDWORM) {
          const g = G.map[packed].groundTileID;
          if (g === G.bloomTileID || g === G.bloomTileID + 1) isSpiceBloom = true;
        }
      }
    }
  }
  unit.distanceToDestination = distance2;
  unit.o.position = newPosition;
  unitSpriteUpdate(unit);
  unitUpdateMap(1, unit);
  if (isSpiceBloom) mapBloomExplodeSpice(packed, unitGetHouseID(unit));
  return ret;
}
function unitDamage(unit, damage, range) {
  if (!unit || !unit.o.flags.allocated) return false;
  let ui = unitInfo[unit.o.type];
  if (!ui.flags.isNormalUnit && unit.o.type !== UNIT.SANDWORM) return false;
  if (G.playtester && unit.o.houseID === G.playerHouseID) return false;
  const alive = unit.o.hitpoints !== 0;
  unit.o.hitpoints = unit.o.hitpoints >= damage ? unit.o.hitpoints - damage : 0;
  unitDeviationDecrease(unit, 0);
  const houseID = unitGetHouseID(unit);
  if (houseID !== G.playerHouseID) G.houses[houseID].flags.isAIActive = true;
  if (unit.o.hitpoints === 0) {
    unitRemovePlayer(unit);
    if (unit.o.type === UNIT.HARVESTER) mapFillCircleWithSpice(packTile(unit.o.position), idiv(unit.amount, 32));
    if (unit.o.type === UNIT.SABOTEUR) {
      G.onFeedback(20);
    } else if (!ui.o.flags.noMessageOnDeath && alive) {
      G.onFeedback(houseID === G.playerHouseID || G.campaignID > 3 ? houseID + 14 : 13);
    }
    unitSetAction(unit, ACTION.DIE);
    return true;
  }
  if (range !== 0) mapMakeExplosion(damage < 25 ? EXPLOSION.IMPACT_SMALL : EXPLOSION.IMPACT_MEDIUM, unit.o.position, 0, 0);
  if (houseID !== G.playerHouseID && unit.actionID === ACTION.AMBUSH && unit.o.type !== UNIT.HARVESTER) unitSetAction(unit, ACTION.ATTACK);
  if (unit.o.hitpoints >= idiv(ui.o.hitpoints, 2)) return false;
  if (unit.o.type === UNIT.SANDWORM) unitSetAction(unit, ACTION.DIE);
  if (unit.o.type === UNIT.TROOPERS || unit.o.type === UNIT.INFANTRY) {
    unit.o.type += 2;
    ui = unitInfo[unit.o.type];
    unit.o.hitpoints = ui.o.hitpoints;
    unitUpdateMap(2, unit);
    if (random256() < houseInfo[unit.o.houseID].toughness) unitSetAction(unit, ACTION.RETREAT);
  }
  if (ui.movementType !== MOVEMENT.TRACKED && ui.movementType !== MOVEMENT.HARVESTER && ui.movementType !== MOVEMENT.WHEELED) return false;
  unit.o.flags.isSmoking = true;
  unit.spriteOffset = 0;
  unit.timer = 0;
  return false;
}
function unitUntargetMe(unit) {
  const encoded = indexEncode(unit.o.index, 2 /* UNIT */);
  objectScriptVariable4Clear(unit.o);
  let find = findAll();
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.targetMove === encoded) u.targetMove = 0;
    if (u.targetAttack === encoded) u.targetAttack = 0;
    if (u.o.script.variables[4] === encoded) objectScriptVariable4Clear(u.o);
  }
  find = findAll();
  for (; ; ) {
    const s = structureFind(find);
    if (!s) break;
    if (s.o.type !== STRUCTURE.TURRET && s.o.type !== STRUCTURE.ROCKET_TURRET) continue;
    if (s.o.script.variables[2] === encoded) s.o.script.variables[2] = 0;
  }
  unitRemoveFromTeam(unit);
  find = findAll();
  for (; ; ) {
    const t = teamFind(find);
    if (!t) break;
    if (t.target === encoded) t.target = 0;
  }
}
function unitSetOrientation(unit, orientation, rotateInstantly, level) {
  if (!unit) return;
  orientation = s8(orientation);
  const o = unit.orientation[level];
  o.speed = 0;
  o.target = orientation;
  if (rotateInstantly) {
    o.current = orientation;
    return;
  }
  if (o.current === orientation) return;
  o.speed = s8(unitInfo[unit.o.type].turningSpeed * 4);
  const diff = orientation - o.current;
  if (diff > -128 && diff < 0 || diff > 128) o.speed = s8(-o.speed);
}
function unitSelect(unit) {
  if (unit === G.unitSelected) return;
  if (unit && !unit.o.flags.allocated) unit = null;
  if (unit && (unit.o.seenByHouses & 1 << G.playerHouseID) === 0) unit = null;
  if (G.unitSelected) unitUpdateMap(2, G.unitSelected);
  if (!unit) {
    G.unitSelected = null;
    G.selectionType = SELECTION.STRUCTURE;
    G.onSelect();
    return;
  }
  if (unitGetHouseID(unit) === G.playerHouseID) {
    G.onSound(unitInfo[unit.o.type].movementType === MOVEMENT.FOOT ? 17 : 15);
  }
  if (G.unitSelected) {
    if (G.unitSelected !== unit) unitDisplayStatusText(unit);
    G.unitSelected = unit;
  } else {
    unitDisplayStatusText(unit);
    G.unitSelected = unit;
    G.selectionType = SELECTION.UNIT;
  }
  unitUpdateMap(2, G.unitSelected);
  G.onSelect();
}
function unitCreateWrapper(houseID, typeID, destination) {
  let t = unpackTile(mapFindLocationTile(random256() & 3, houseID));
  const h = G.houses[houseID];
  const orientation = tileGetDirection(t, { x: 8192, y: 8192 });
  if (unitInfo[typeID].movementType === MOVEMENT.WINGER) {
    G.validateStrictIfZero++;
    const unit2 = unitCreate(INDEX_INVALID, typeID, houseID, t, orientation);
    G.validateStrictIfZero--;
    if (!unit2) return null;
    unit2.o.flags.byScenario = true;
    if (destination !== 0) unitSetDestination(unit2, destination);
    return unit2;
  }
  G.validateStrictIfZero++;
  const carryall = unitCreate(INDEX_INVALID, UNIT.CARRYALL, houseID, t, orientation);
  G.validateStrictIfZero--;
  if (!carryall) {
    if (typeID === UNIT.HARVESTER && h.harvestersIncoming === 0) h.harvestersIncoming++;
    return null;
  }
  if (houseAreAllied(houseID, G.playerHouseID) || unitIsTypeOnMap(houseID, UNIT.CARRYALL)) carryall.o.flags.byScenario = true;
  t = { x: 65535, y: 65535 };
  G.validateStrictIfZero++;
  const unit = unitCreate(INDEX_INVALID, typeID, houseID, t, 0);
  G.validateStrictIfZero--;
  if (!unit) {
    unitRemove(carryall);
    if (typeID === UNIT.HARVESTER && h.harvestersIncoming === 0) h.harvestersIncoming++;
    return null;
  }
  carryall.o.flags.inTransport = true;
  carryall.o.linkedID = unit.o.index & 255;
  if (typeID === UNIT.HARVESTER) unit.amount = 1;
  if (destination !== 0) unitSetDestination(carryall, destination);
  return unit;
}
var AROUND = [0, -1, 1, -64, 64, -65, -63, 65, 63];
function unitFindTargetAround(packed) {
  if (G.selectionType === SELECTION.PLACE) return packed;
  if (structureGetByPackedTile(packed)) return packed;
  if (mapGetLandscapeType(packed) === LST.BLOOM_FIELD) return packed;
  for (const d of AROUND) {
    const u = unitGetByPackedTile(u16(packed + d));
    if (!u) continue;
    return packTile(u.o.position);
  }
  return packed;
}
function unitIsTileOccupied(unit) {
  if (!unit) return true;
  const ui = unitInfo[unit.o.type];
  const packed = packTile(unit.o.position);
  const speed = landscapeInfo[mapGetLandscapeType(packed)].movementSpeed[ui.movementType];
  if (speed === 0) return true;
  if (unit.o.type === UNIT.SANDWORM || ui.movementType === MOVEMENT.WINGER) return false;
  const unit2 = unitGetByPackedTile(packed);
  if (unit2 && unit2 !== unit) {
    if (houseAreAllied(unitGetHouseID(unit2), unitGetHouseID(unit))) return true;
    if (ui.movementType !== MOVEMENT.TRACKED) return true;
    if (unitInfo[unit2.o.type].movementType !== MOVEMENT.FOOT) return true;
  }
  return structureGetByPackedTile(packed) !== null;
}
function unitSetSpeed(unit, speed) {
  unit.speed = 0;
  unit.speedRemainder = 0;
  unit.speedPerTick = 0;
  if (unit.o.type === UNIT.HARVESTER) speed = idiv((255 - unit.amount) * speed, 256);
  if (speed === 0 || speed >= 256) {
    unit.movingSpeed = 0;
    return;
  }
  unit.movingSpeed = speed & 255;
  speed = idiv(unitInfo[unit.o.type].movingSpeedFactor * speed, 256);
  if (unitInfo[unit.o.type].movementType !== MOVEMENT.WINGER) speed = adjustToGameSpeed(speed, 1, 255, false);
  let speedPerTick = u16(speed << 4);
  speed = speed >> 4;
  if (speed !== 0) speedPerTick = 255;
  else speed = 1;
  unit.speed = speed & 255;
  unit.speedPerTick = speedPerTick & 255;
}
function unitCreateBullet(position, type, houseID, damage, target) {
  if (!indexIsValid(target)) return null;
  const ui = unitInfo[type];
  const t = indexGetTile(target);
  switch (type) {
    case UNIT.MISSILE_HOUSE:
    case UNIT.MISSILE_ROCKET:
    case UNIT.MISSILE_TURRET:
    case UNIT.MISSILE_DEVIATOR:
    case UNIT.MISSILE_TROOPER: {
      const orientation = tileGetDirection(position, t);
      const bullet = unitCreate(INDEX_INVALID, type, houseID, position, orientation);
      if (!bullet) return null;
      G.onSound(ui.bulletSound, position);
      bullet.targetAttack = target;
      bullet.o.hitpoints = damage;
      bullet.currentDestination = { ...t };
      if (ui.flags.notAccurate) {
        bullet.currentDestination = tileMoveByRandom(
          t,
          (random256() & 15) !== 0 ? idiv(tileGetDistance(position, t), 256) + 8 : random256() + 8,
          false
        );
      }
      bullet.fireDelay = ui.fireDistance & 255;
      const u = indexGetUnit(target);
      if (u && unitInfo[u.o.type].movementType === MOVEMENT.WINGER) bullet.fireDelay = u8(bullet.fireDelay << 1);
      if (type === UNIT.MISSILE_HOUSE || (bullet.o.seenByHouses & 1 << G.playerHouseID) !== 0) return bullet;
      tileRemoveFogInRadius(bullet.o.position, 2);
      return bullet;
    }
    case UNIT.BULLET:
    case UNIT.SONIC_BLAST: {
      const orientation = tileGetDirection(position, t);
      const p = tileMoveByDirection(tileMoveByDirection(position, 0, 32), orientation, 128);
      const bullet = unitCreate(INDEX_INVALID, type, houseID, p, orientation);
      if (!bullet) return null;
      if (type === UNIT.SONIC_BLAST) bullet.fireDelay = ui.fireDistance & 255;
      bullet.currentDestination = { ...t };
      bullet.o.hitpoints = damage;
      if (damage > 15) bullet.o.flags.bulletIsBig = true;
      if ((bullet.o.seenByHouses & 1 << G.playerHouseID) !== 0) return bullet;
      tileRemoveFogInRadius(bullet.o.position, 2);
      return bullet;
    }
    default:
      return null;
  }
}
function unitDisplayStatusText(unit) {
  if (!unit) return;
  G.onMessage(msg.unitStatus(unit), 2);
}
function unitHide(unit) {
  if (!unit) return;
  unit.o.flags.bulletIsBig = true;
  unitUpdateMap(0, unit);
  unit.o.flags.bulletIsBig = false;
  scriptReset(unit.o.script, G.scriptUnit);
  unitUntargetMe(unit);
  unit.o.flags.isNotOnMap = true;
  unitHouseUnitCountRemove(unit);
}
function unitCallUnitByType(type, houseID, target, createCarryall) {
  let unit = null;
  const find = findAll(houseID, type);
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.o.linkedID !== 255) continue;
    if (u.targetMove !== 0) continue;
    unit = u;
  }
  if (createCarryall && !unit && type === UNIT.CARRYALL) {
    G.validateStrictIfZero++;
    unit = unitCreate(INDEX_INVALID, type, houseID, { x: 0, y: 0 }, 96);
    G.validateStrictIfZero--;
    if (unit) unit.o.flags.byScenario = true;
  }
  if (unit) {
    if (type === UNIT.CARRYALL) unitSetAction(unit, ACTION.MOVE);
    unit.targetMove = target;
    objectScriptVariable4Set(unit.o, target);
  }
  return unit;
}
function unitEnterStructure(unit, s) {
  if (!unit || !s) return;
  if (unit === G.unitSelected) unitSelect(null);
  const ui = unitInfo[unit.o.type];
  const si = structureInfo[s.o.type];
  if (!unit.o.flags.allocated || s.o.hitpoints === 0) {
    unitRemove(unit);
    return;
  }
  unit.o.seenByHouses |= s.o.seenByHouses;
  unitHide(unit);
  if (houseAreAllied(s.o.houseID, unitGetHouseID(unit))) {
    structureSetState(s, si.o.flags.busyStateIsIncoming ? 2 : 1);
    if (s.o.type === STRUCTURE.REPAIR) {
      const countDown = u16(idiv(idiv((ui.o.hitpoints - unit.o.hitpoints) * 256, ui.o.hitpoints) * (ui.o.buildTime << 6), 256));
      s.countDown = countDown > 1 ? countDown : 1;
      unit.repairTime = s.countDown;
      unit.o.hitpoints = ui.o.hitpoints;
      unit.o.flags.isSmoking = false;
      unit.spriteOffset = 0;
    }
    unit.o.linkedID = s.o.linkedID;
    s.o.linkedID = unit.o.index & 255;
    return;
  }
  if (unit.o.type === UNIT.SABOTEUR) {
    structureDamage(s, 500, 1);
    unitRemove(unit);
    return;
  }
  if (s.o.hitpoints < idiv(si.o.hitpoints, 4)) {
    let h = G.houses[s.o.houseID];
    s.o.houseID = unitGetHouseID(unit);
    h.structuresBuilt = structureGetStructuresBuilt(h);
    h = G.houses[s.o.houseID];
    h.structuresBuilt = structureGetStructuresBuilt(h);
    if (s.o.linkedID !== 255) {
      const u = G.units[s.o.linkedID];
      if (u) u.o.houseID = unitGetHouseID(unit);
    }
    houseCalculatePowerAndCredit(G.houses[s.o.houseID]);
    structureUpdateMap(s);
  } else {
    structureDamage(s, Math.min(unit.o.hitpoints * 2, idiv(s.o.hitpoints, 2)), 1);
  }
  objectScriptVariable4Clear(s.o);
  unitRemove(unit);
}
function unitFindBestTargetStructure(unit, mode) {
  if (!unit) return null;
  const position = indexGetTile(unit.originEncoded);
  const distance2 = u16(unitInfo[unit.o.type].fireDistance << 8);
  let best = null;
  let bestPriority = 0;
  const find = findAll();
  for (; ; ) {
    const s = structureFind(find);
    if (!s) break;
    if (s.o.type === STRUCTURE.SLAB_1x1 || s.o.type === STRUCTURE.SLAB_2x2 || s.o.type === STRUCTURE.WALL) continue;
    const diff = layoutTileDiff[structureInfo[s.o.type].layout];
    const cur2 = tile(s.o.position.x + diff.x, s.o.position.y + diff.y);
    if (mode !== 0 && mode !== 4) {
      if (mode === 1) {
        if (tileGetDistance(unit.o.position, cur2) > distance2) continue;
      } else {
        if (mode !== 2) continue;
        if (tileGetDistance(position, cur2) > distance2 * 2) continue;
      }
    }
    const priority = unitGetTargetStructurePriority(unit, s);
    if (priority >= bestPriority) {
      best = s;
      bestPriority = priority;
    }
  }
  if (bestPriority === 0) return null;
  return best;
}
function unitGetTileEnterScore(unit, packed, orient8) {
  if (!unit) return 0;
  packed = u16(packed);
  const ui = unitInfo[unit.o.type];
  if (!mapIsValidPosition(packed) && ui.movementType !== MOVEMENT.WINGER) return 256;
  const u = unitGetByPackedTile(packed);
  if (u && u !== unit && unit.o.type !== UNIT.SANDWORM) {
    if (unit.o.type === UNIT.SABOTEUR && unit.targetMove === indexEncode(u.o.index, 2 /* UNIT */)) return 0;
    if (houseAreAllied(unitGetHouseID(u), unitGetHouseID(unit))) return 256;
    if (unitInfo[u.o.type].movementType !== MOVEMENT.FOOT || ui.movementType !== MOVEMENT.TRACKED && ui.movementType !== MOVEMENT.HARVESTER) return 256;
  }
  const s = structureGetByPackedTile(packed);
  if (s) {
    const res2 = unitIsValidMovementIntoStructure(unit, s);
    if (res2 === 0) return 256;
    if (unit.o.type === UNIT.HARVESTER && s.o.type === STRUCTURE.REFINERY && (packed !== packTile(refineryDock(s.o.position)) || orient8 !== 0)) return 256;
    return -res2;
  }
  const type = mapGetLandscapeType(packed);
  let res = landscapeInfo[type].movementSpeed[ui.movementType];
  if (unit.o.type === UNIT.SABOTEUR && type === LST.WALL) {
    if (!houseAreAllied(G.map[packed].houseID, unitGetHouseID(unit))) res = 255;
  }
  if (res === 0) return 256;
  if ((orient8 & 1) !== 0) res -= idiv(res, 4) + idiv(res, 8);
  res ^= 255;
  return s16(res);
}
function unitFindBestTargetEncoded(unit, mode) {
  if (!unit) return 0;
  let s = null;
  if (mode === 4) {
    s = unitFindBestTargetStructure(unit, mode);
    if (s) return indexEncode(s.o.index, 3 /* STRUCTURE */);
    const target2 = unitFindBestTargetUnit(unit, mode);
    if (!target2) return 0;
    return indexEncode(target2.o.index, 2 /* UNIT */);
  }
  const target = unitFindBestTargetUnit(unit, mode);
  if (unit.o.type !== UNIT.DEVIATOR) s = unitFindBestTargetStructure(unit, mode);
  if (target && s) {
    const priority = unitGetTargetUnitPriority(unit, target);
    if (unitGetTargetStructurePriority(unit, s) >= priority) return indexEncode(s.o.index, 3 /* STRUCTURE */);
    return indexEncode(target.o.index, 2 /* UNIT */);
  }
  if (target) return indexEncode(target.o.index, 2 /* UNIT */);
  if (s) return indexEncode(s.o.index, 3 /* STRUCTURE */);
  return 0;
}
function unitRemovePlayer(unit) {
  if (!unit) return;
  if (unitGetHouseID(unit) !== G.playerHouseID) return;
  if (!unit.o.flags.allocated) return;
  unit.o.flags.allocated = false;
  unitRemoveFromTeam(unit);
  if (unit !== G.unitSelected) return;
  if (G.selectionType === SELECTION.TARGET) {
    G.unitActive = null;
    G.activeAction = 65535;
    G.selectionType = SELECTION.STRUCTURE;
  }
  unitSelect(null);
}
function unitUpdateMap(type, unit) {
  if (!unit || unit.o.flags.isNotOnMap || !unit.o.flags.used) return;
  const ui = unitInfo[unit.o.type];
  if (ui.movementType === MOVEMENT.WINGER) {
    if (type !== 0) unit.o.flags.isDirty = true;
    mapUpdateAround(ui.dimension, unit.o.position, unit, FUNCTIONS[0][type]);
    return;
  }
  const position = unit.o.position;
  const packed = packTile(position);
  const t = G.map[packed];
  if (t.isUnveiled || unit.o.houseID === G.playerHouseID) unitHouseUnitCountAdd(unit, G.playerHouseID);
  else unitHouseUnitCountRemove(unit);
  if (type === 1) {
    if (houseAreAllied(unitGetHouseID(unit), G.playerHouseID) && !mapIsPositionUnveiled(packed) && unit.o.type !== UNIT.SANDWORM) {
      tileRemoveFogInRadius(position, 1);
    }
    if (objectGetByPackedTile(packed) === null) {
      t.index = unit.o.index + 1;
      t.hasUnit = true;
    }
  }
  if (type !== 0) unit.o.flags.isDirty = true;
  let radius = ui.dimension + 3;
  if (unit.o.flags.bulletIsBig || unit.o.flags.isSmoking || unit.o.type === UNIT.HARVESTER && unit.actionID === ACTION.HARVEST) radius = 33;
  mapUpdateAround(radius, position, unit, FUNCTIONS[1][type]);
  if (unit.o.type !== UNIT.HARVESTER) return;
  mapUpdateAround(radius, unit.targetPreLast, unit, FUNCTIONS[1][type]);
  mapUpdateAround(radius, unit.targetLast, unit, FUNCTIONS[1][type]);
}
function unitRemoveFromTileFn(unit, packed) {
  const t = G.map[packed];
  if (t.hasUnit && unitGetByPackedTile(packed) === unit && (packed !== packTile(unit.currentDestination) || unit.o.flags.bulletIsBig)) {
    t.index = 0;
    t.hasUnit = false;
  }
}
function unitAddToTileFn(unit, packed) {
  mapUnveilTile(packed, unitGetHouseID(unit));
}
function unitGetTargetStructurePriority(unit, target) {
  if (!unit || !target) return 0;
  if (houseAreAllied(unitGetHouseID(unit), target.o.houseID)) return 0;
  if ((target.o.seenByHouses & 1 << unitGetHouseID(unit)) === 0) return 0;
  const si = structureInfo[target.o.type];
  let priority = u16(si.o.priorityBuild + si.o.priorityTarget);
  const distance2 = tileGetDistanceRoundedUp(unit.o.position, target.o.position);
  if (distance2 !== 0) priority = idiv(priority, distance2);
  return Math.min(priority, 32e3);
}
function unitLaunchHouseMissile(packed) {
  const m = G.unitHouseMissile;
  if (!m) return;
  const h = G.houses[m.o.houseID];
  let t = unpackTile(packed);
  t = tileMoveByRandom(t, 160, false);
  packed = packTile(t);
  const isAI = m.o.houseID !== G.playerHouseID;
  unitFree(m);
  G.onFeedback(65534);
  unitCreateBullet(h.palacePosition, m.o.type, m.o.houseID, 500, indexEncode(packed, 1 /* TILE */));
  G.houseMissileCountdown = 0;
  G.unitHouseMissile = null;
  if (isAI) {
    G.onFeedback(39);
    return;
  }
  G.selectionType = SELECTION.STRUCTURE;
}
function unitHouseUnitCountRemove(unit) {
  if (!unit) return;
  if (unit.o.seenByHouses === 0) return;
  const find = findAll();
  for (; ; ) {
    const h = houseFind(find);
    if (!h) break;
    if ((unit.o.seenByHouses & 1 << h.index) === 0) continue;
    if (!houseAreAllied(h.index, unitGetHouseID(unit))) h.unitCountEnemy--;
    else h.unitCountAllied--;
    unit.o.seenByHouses &= ~(1 << h.index);
  }
}
function unitHouseUnitCountAdd(unit, houseID) {
  if (!unit) return;
  const hp = G.houses[G.playerHouseID];
  const ui = unitInfo[unit.o.type];
  const h = G.houses[houseID];
  let houseIDBit = 1 << houseID;
  if (houseID === HOUSE.ATREIDES && unit.o.type !== UNIT.SANDWORM) houseIDBit |= 1 << HOUSE.FREMEN;
  if ((unit.o.seenByHouses & houseIDBit) !== 0 && h.flags.isAIActive) {
    unit.o.seenByHouses |= houseIDBit;
    return;
  }
  if (!ui.flags.isNormalUnit && unit.o.type !== UNIT.SANDWORM) return;
  if ((unit.o.seenByHouses & houseIDBit) === 0) {
    if (houseAreAllied(houseID, unitGetHouseID(unit))) h.unitCountAllied++;
    else h.unitCountEnemy++;
  }
  if (ui.movementType !== MOVEMENT.WINGER) {
    if (!houseAreAllied(houseID, unitGetHouseID(unit))) {
      h.flags.isAIActive = true;
      G.houses[unitGetHouseID(unit)].flags.isAIActive = true;
    }
  }
  if (houseID === G.playerHouseID && G.selectionType !== SELECTION.MENTAT) {
    if (unit.o.type === UNIT.SANDWORM) {
      if (hp.timerSandwormAttack === 0) {
        if (G.musicInBattle === 0) G.musicInBattle = 1;
        G.onFeedback(37);
        G.onMessage(msg.sandworms, 1);
        hp.timerSandwormAttack = 8;
      }
    } else if (!houseAreAllied(G.playerHouseID, unitGetHouseID(unit))) {
      if (hp.timerUnitAttack === 0) {
        if (G.musicInBattle === 0) G.musicInBattle = 1;
        if (unit.o.type === UNIT.SABOTEUR) {
          G.onFeedback(12);
        } else if (G.scenarioID < 3) {
          const s = structureFind(findAll(G.playerHouseID, STRUCTURE.CONSTRUCTION_YARD));
          let feedbackID;
          if (s) feedbackID = idiv(orientation8(tileGetDirection(s.o.position, unit.o.position)) + 1 & 7, 2) + 2;
          else feedbackID = 1;
          G.onFeedback(feedbackID);
        } else {
          G.onFeedback(unit.o.houseID + 6);
        }
        hp.timerUnitAttack = 8;
      }
      const t = unit.team < 16 ? G.teams[unit.team] : null;
      if (t) t.script.variables[4] = 1;
    }
  }
  if (!houseAreAllied(houseID, unit.o.houseID) && unit.actionID === ACTION.AMBUSH) unitSetAction(unit, ACTION.HUNT);
  if (unit.o.houseID === G.playerHouseID || unit.o.houseID === HOUSE.FREMEN && G.playerHouseID === HOUSE.ATREIDES) unit.o.seenByHouses = 255;
  else unit.o.seenByHouses |= houseIDBit;
}

// web/src/engine/strings.ts
var HOUSE_NAMES_GEN = ["\u0425\u0430\u0440\u043A\u043E\u043D\u043D\u0435\u043D\u043E\u0432", "\u0410\u0442\u0440\u0435\u0439\u0434\u0435\u0441\u043E\u0432", "\u041E\u0440\u0434\u043E\u0441\u043E\u0432", "\u0424\u0440\u0438\u043C\u0435\u043D\u043E\u0432", "\u0421\u0430\u0440\u0434\u0430\u0443\u043A\u0430\u0440\u043E\u0432", "\u041D\u0430\u0451\u043C\u043D\u0438\u043A\u043E\u0432"];
var unitName = (t) => UNIT_NAMES[t] ?? `\u044E\u043D\u0438\u0442 ${t}`;
var structureName = (t) => STRUCTURE_NAMES[t] ?? `\u0437\u0434\u0430\u043D\u0438\u0435 ${t}`;
var msg = {
  unitStatus(u) {
    if (u.o.type === UNIT.SANDWORM) return "\u041F\u0435\u0441\u0447\u0430\u043D\u044B\u0439 \u0447\u0435\u0440\u0432\u044C.";
    let s = `${unitName(u.o.type)} ${HOUSE_NAMES_GEN[unitGetHouseID(u)] ?? ""}`.trim();
    if (u.o.type === UNIT.HARVESTER) {
      const full = `\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D \u043D\u0430 ${u.amount}%`;
      let tail = full;
      if (u.actionID === ACTION.HARVEST && u.amount < 100) {
        const type = mapGetLandscapeType(packTile(u.o.position));
        if (type === LST.SPICE || type === LST.THICK_SPICE) tail = `${full}, \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442 \u043F\u0440\u044F\u043D\u043E\u0441\u0442\u044C`;
      }
      if (u.actionID === ACTION.MOVE && indexGetStructure(u.targetMove)) tail = `${full}, \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F`;
      else if (u.o.script.variables[4] !== 0) tail = `${full}, \u0436\u0434\u0451\u0442 \u0442\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442\u043D\u0438\u043A`;
      if (u.amount === 0) tail = tail.replace(full, "\u043F\u0443\u0441\u0442");
      s += `: ${tail}`;
    }
    return s + ".";
  },
  buildComplete(structureType, objectType) {
    if (structureType === STRUCTURE.CONSTRUCTION_YARD) return `${structureName(objectType)}: \u0433\u043E\u0442\u043E\u0432\u043E, \u043C\u043E\u0436\u043D\u043E \u0441\u0442\u0430\u0432\u0438\u0442\u044C.`;
    if (structureType === STRUCTURE.HIGH_TECH) return `${unitName(objectType)}: \u0433\u043E\u0442\u043E\u0432\u043E.`;
    return `${unitName(objectType)}: \u0433\u043E\u0442\u043E\u0432 \u0438 \u0436\u0434\u0451\u0442 \u043F\u0440\u0438\u043A\u0430\u0437\u043E\u0432.`;
  },
  productionStarted(structureType, objectType) {
    const name = structureType === STRUCTURE.CONSTRUCTION_YARD ? structureName(objectType) : unitName(objectType);
    return `\u041D\u0430\u0447\u0430\u0442\u043E \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0441\u0442\u0432\u043E: ${name}.`;
  },
  cannotPlace(type) {
    return `\u0417\u0434\u0435\u0441\u044C \u043D\u0435\u043B\u044C\u0437\u044F \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C: ${structureName(type)}.`;
  },
  destroyed(houseID, type, isStructure) {
    return `${isStructure ? structureName(type) : unitName(type)} ${HOUSE_NAMES_GEN[houseID] ?? ""} \u0443\u043D\u0438\u0447\u0442\u043E\u0436\u0435\u043D.`;
  },
  insufficientFunds: "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432. \u0421\u0442\u0440\u043E\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E.",
  unableToCreateMore: "\u0411\u043E\u043B\u044C\u0448\u0435 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F.",
  upgradingStarts: "\u0423\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435 \u043D\u0430\u0447\u0430\u0442\u043E.",
  upgradingStops: "\u0423\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E.",
  repairingStarts: "\u0420\u0435\u043C\u043E\u043D\u0442 \u043D\u0430\u0447\u0430\u0442.",
  repairingStops: "\u0420\u0435\u043C\u043E\u043D\u0442 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D.",
  cannotPlaceFoundation: "\u0417\u0434\u0435\u0441\u044C \u043D\u0435\u043B\u044C\u0437\u044F \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u044C \u0431\u0435\u0442\u043E\u043D.",
  notEnoughPowerForRadar: "\u0420\u0430\u0434\u0430\u0440\u0443 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u044D\u043D\u0435\u0440\u0433\u0438\u0438. \u041F\u043E\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u0432\u0435\u0442\u0440\u044F\u043A\u0438.",
  insufficientPower: "\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u044D\u043D\u0435\u0440\u0433\u0438\u0438. \u041D\u0443\u0436\u0435\u043D \u0432\u0435\u0442\u0440\u044F\u043A.",
  spiceLost: "\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449 \u2014 \u043F\u0440\u044F\u043D\u043E\u0441\u0442\u044C \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u0430.",
  storageLow: "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430 \u043F\u043E\u0447\u0442\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u044B. \u041F\u043E\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430 \u043F\u0440\u044F\u043D\u043E\u0441\u0442\u0438.",
  creditsLow: "\u041C\u0430\u043B\u043E \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432. \u0421\u043E\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u043F\u0440\u044F\u043D\u043E\u0441\u0442\u044C.",
  harvesterHeading: "\u0425\u0430\u0440\u0432\u0435\u0441\u0442\u0435\u0440 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043A \u043E\u0447\u0438\u0441\u0442\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u043C\u0443 \u0437\u0430\u0432\u043E\u0434\u0443.",
  sandworms: "\u0412\u043D\u0438\u043C\u0430\u043D\u0438\u0435: \u043F\u0435\u0441\u0447\u0430\u043D\u044B\u0435 \u0447\u0435\u0440\u0432\u0438! \u0428\u0430\u0439-\u0425\u0443\u043B\u0443\u0434 \u043F\u043E\u0436\u0438\u0440\u0430\u0435\u0442 \u0432\u0441\u0451 \u043D\u0430 \u043F\u0435\u0441\u043A\u0435.",
  unableToDeploy: "\u0417\u0434\u0435\u0441\u044C \u0440\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0435\u043B\u044C\u0437\u044F.",
  searchSpice: "\u0418\u0449\u0438\u0442\u0435 \u043F\u043E\u043B\u044F \u043F\u0440\u044F\u043D\u043E\u0441\u0442\u0438 \u0434\u043B\u044F \u0441\u0431\u043E\u0440\u0430.",
  missionWon: "\u041C\u0438\u0441\u0441\u0438\u044F \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430!",
  missionLost: "\u041C\u0438\u0441\u0441\u0438\u044F \u043F\u0440\u043E\u0432\u0430\u043B\u0435\u043D\u0430."
};

// web/src/engine/house.ts
var ticks4 = { house: 0, starport: 0, reinforcement: 0, missileCountdown: 0, starportAvailability: 0 };
function houseResetTimers() {
  for (const k of Object.keys(ticks4)) ticks4[k] = 0;
  G.tickHousePowerMaintenance = 0;
}
function gameLoopHouse() {
  let tickHouse = false;
  let tickPowerMaintenance = false;
  let tickStarport = false;
  let tickReinforcement = false;
  let tickMissileCountdown = false;
  let tickStarportAvailability = false;
  const now = G.timerGame;
  if (ticks4.house <= now) {
    tickHouse = true;
    ticks4.house = now + 900;
  }
  if (G.tickHousePowerMaintenance <= now) {
    tickPowerMaintenance = true;
    G.tickHousePowerMaintenance = now + 10800;
  }
  if (ticks4.starport <= now) {
    tickStarport = true;
    ticks4.starport = now + 180;
  }
  if (ticks4.reinforcement <= now) {
    tickReinforcement = true;
    ticks4.reinforcement = now + 600;
  }
  if (ticks4.missileCountdown <= now) {
    tickMissileCountdown = true;
    ticks4.missileCountdown = now + 60;
  }
  if (ticks4.starportAvailability <= now) {
    tickStarportAvailability = true;
    ticks4.starportAvailability = now + 1800;
  }
  if (tickMissileCountdown && G.houseMissileCountdown !== 0) {
    G.houseMissileCountdown--;
    G.onFeedback(G.houseMissileCountdown + 41);
    if (G.houseMissileCountdown === 0) unitLaunchHouseMissile(mapFindLocationTile(4, G.playerHouseID));
  }
  if (tickStarportAvailability) {
    const type = randomRange(0, UNIT.MAX - 1);
    if (G.starportAvailable[type] !== 0 && G.starportAvailable[type] < 10) {
      if (G.starportAvailable[type] === -1) G.starportAvailable[type] = 1;
      else G.starportAvailable[type]++;
    }
  }
  if (tickReinforcement) {
    let nu = null;
    for (const r of G.scenario.reinforcement) {
      if (r.unitID === INDEX_INVALID) continue;
      if (r.timeLeft === 0) continue;
      if (--r.timeLeft !== 0) continue;
      let u = G.units[r.unitID];
      const locationID = r.locationID;
      let deployed = false;
      if (locationID >= 4) {
        if (!nu) {
          nu = unitCreate(INDEX_INVALID, UNIT.CARRYALL, u.o.houseID, unpackTile(mapFindLocationTile(random256() & 3, u.o.houseID)), 100);
          if (nu) {
            nu.o.flags.byScenario = true;
            unitSetDestination(nu, indexEncode(mapFindLocationTile(locationID, u.o.houseID), 1 /* TILE */));
          }
        }
        if (nu) {
          u.o.linkedID = nu.o.linkedID;
          nu.o.linkedID = u.o.index & 255;
          nu.o.flags.inTransport = true;
          r.unitID = INDEX_INVALID;
          deployed = true;
        } else {
          r.timeLeft = 1;
        }
      } else {
        deployed = unitSetPosition(u, unpackTile(mapFindLocationTile(locationID, u.o.houseID)));
      }
      if (deployed && r.repeat !== 0) {
        G.validateStrictIfZero++;
        const nu2 = unitCreate(INDEX_INVALID, u.o.type, u.o.houseID, { x: 65535, y: 65535 }, 0);
        G.validateStrictIfZero--;
        if (nu2) {
          u = nu2;
          r.unitID = u.o.index;
          r.timeLeft = r.timeBetween;
        }
      }
    }
  }
  const find = findAll();
  for (; ; ) {
    const h = houseFind(find);
    if (!h) break;
    if (tickHouse) {
      if (h.index !== G.playerHouseID) {
        if (h.creditsStorage < h.credits) h.credits = h.creditsStorage;
      } else {
        const maxCredits = Math.max(h.creditsStorage, G.playerCreditsNoSilo);
        if (h.credits > maxCredits) {
          h.credits = maxCredits;
          G.onMessage(msg.spiceLost, 1);
        }
      }
      if (h.index === G.playerHouseID) {
        if (h.creditsStorage > G.playerCreditsNoSilo) G.playerCreditsNoSilo = 0;
        if (G.playerCreditsNoSilo === 0 && G.campaignID > 1 && h.credits !== 0) {
          if (h.creditsStorage !== 0 && idiv(h.credits * 256, h.creditsStorage) > 200) G.onMessage(msg.storageLow, 0);
        }
        if (h.credits < 100 && G.playerCreditsNoSilo !== 0) G.onMessage(msg.creditsLow, 0);
      }
    }
    if (tickHouse) houseEnsureHarvesterAvailable(h.index);
    if (tickStarport && h.starportLinkedID !== INDEX_INVALID) {
      let u = null;
      h.starportTimeLeft = Math.max(0, h.starportTimeLeft - 1);
      if (h.starportTimeLeft === 0) {
        let s = G.structures[G.structureIndex];
        if (s.o.type === STRUCTURE.STARPORT && s.o.houseID === h.index) {
          u = unitCreateWrapper(h.index, UNIT.FRIGATE, indexEncode(s.o.index, 3 /* STRUCTURE */));
        } else {
          const find2 = findAll(h.index, STRUCTURE.STARPORT);
          for (; ; ) {
            const s2 = structureFind(find2);
            if (!s2) break;
            s = s2;
            if (s.o.linkedID !== 255) continue;
            u = unitCreateWrapper(h.index, UNIT.FRIGATE, indexEncode(s.o.index, 3 /* STRUCTURE */));
            break;
          }
        }
        if (u) {
          u.o.linkedID = h.starportLinkedID & 255;
          h.starportLinkedID = INDEX_INVALID;
          u.o.flags.inTransport = true;
          if (h.index === G.playerHouseID) G.onFeedback(48);
        }
        h.starportTimeLeft = u ? houseInfo[h.index].starportDeliveryTime : 1;
      }
    }
    if (tickHouse) {
      houseCalculatePowerAndCredit(h);
      structureCalculateHitpointsMax(h);
      if (h.timerUnitAttack !== 0) h.timerUnitAttack--;
      if (h.timerSandwormAttack !== 0) h.timerSandwormAttack--;
      if (h.timerStructureAttack !== 0) h.timerStructureAttack--;
      if (h.harvestersIncoming > 0 && unitCreateWrapper(h.index, UNIT.HARVESTER, 0)) h.harvestersIncoming--;
    }
    if (tickPowerMaintenance) {
      const cost = idiv(h.powerUsage, 32) + 1;
      h.credits -= Math.min(h.credits, cost);
    }
  }
}
function houseEnsureHarvesterAvailable(houseID) {
  let find = findAll(houseID);
  for (; ; ) {
    const s2 = structureFind(find);
    if (!s2) break;
    if (s2.o.type === STRUCTURE.HEAVY_VEHICLE) continue;
    if (s2.o.linkedID === UNIT.INVALID) continue;
    if (G.units[s2.o.linkedID].o.type === UNIT.HARVESTER) return;
  }
  find = findAll(houseID, UNIT.CARRYALL);
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.o.linkedID === UNIT.INVALID) continue;
    if (G.units[u.o.linkedID].o.type === UNIT.HARVESTER) return;
  }
  if (unitIsTypeOnMap(houseID, UNIT.HARVESTER)) return;
  const s = structureFind(findAll(houseID, STRUCTURE.REFINERY));
  if (!s) return;
  if (!unitCreateWrapper(houseID, UNIT.HARVESTER, indexEncode(s.o.index, 3 /* STRUCTURE */))) return;
  if (houseID !== G.playerHouseID) return;
  G.onMessage(msg.harvesterHeading, 0);
}
function houseAreAllied(houseID1, houseID2) {
  if (houseID1 === HOUSE_INVALID || houseID2 === HOUSE_INVALID) return false;
  if (houseID1 === houseID2) return true;
  if (houseID1 === HOUSE.FREMEN || houseID2 === HOUSE.FREMEN) return houseID1 === HOUSE.ATREIDES || houseID2 === HOUSE.ATREIDES;
  return houseID1 !== G.playerHouseID && houseID2 !== G.playerHouseID;
}
function houseUpdateRadarState(h) {
  if (!h || h.index !== G.playerHouseID) return false;
  let activate = h.flags.radarActivated;
  const hasOutpost = (h.structuresBuilt & 1 << STRUCTURE.OUTPOST) !== 0;
  if (h.flags.radarActivated) {
    if (!hasOutpost || h.powerProduction < h.powerUsage) activate = false;
  } else if (hasOutpost && h.powerProduction >= h.powerUsage) {
    activate = true;
  }
  if (h.flags.radarActivated === activate) return false;
  G.onFeedback(activate ? 28 : 29);
  h.flags.radarActivated = activate;
  return activate;
}
function houseUpdateCreditsStorage(houseID) {
  const old = G.validateStrictIfZero;
  G.validateStrictIfZero = 0;
  let creditsStorage = 0;
  const find = findAll(houseID);
  for (; ; ) {
    const s = structureFind(find);
    if (!s) break;
    creditsStorage += structureInfo[s.o.type].creditsStorage;
  }
  if (creditsStorage > 32e3) creditsStorage = 32e3;
  G.houses[houseID].creditsStorage = creditsStorage;
  G.validateStrictIfZero = old;
}
function houseCalculatePowerAndCredit(h) {
  if (!h) return;
  h.powerUsage = 0;
  h.powerProduction = 0;
  h.creditsStorage = 0;
  const find = findAll(h.index);
  for (; ; ) {
    const s = structureFind(find);
    if (!s) break;
    const si = structureInfo[s.o.type];
    h.creditsStorage += si.creditsStorage;
    if (si.powerUsage >= 0) {
      h.powerUsage += si.powerUsage;
      continue;
    }
    if (s.o.hitpoints >= si.o.hitpoints) {
      h.powerProduction += -si.powerUsage;
      continue;
    }
    if (s.o.hitpoints <= idiv(si.o.hitpoints, 2)) {
      h.powerProduction += idiv(-si.powerUsage, 2);
      continue;
    }
    h.powerProduction += idiv(-si.powerUsage * s.o.hitpoints, si.o.hitpoints);
  }
  if (h.index === G.playerHouseID && h.powerUsage > h.powerProduction) G.onMessage(msg.insufficientPower, 1);
  if (h.index === G.playerHouseID && h.structuresBuilt === 0 && G.validateStrictIfZero === 0) G.playerCreditsNoSilo = 0;
}

// web/src/engine/map.ts
var mapInfo = () => MAP_INFOS[G.mapScale];
function mapIsValidPosition(position) {
  if ((position & 49152) !== 0) return false;
  const x = packedX(position);
  const y = packedY(position);
  const mi = mapInfo();
  return mi.minX <= x && x < mi.minX + mi.sizeX && mi.minY <= y && y < mi.minY + mi.sizeY;
}
function tileIsUnveiled(tileID) {
  if (tileID > G.veiledTileID) return true;
  if (tileID < G.veiledTileID - 15) return true;
  return false;
}
function mapIsPositionUnveiled(position) {
  const t = G.map[position & 4095];
  if (!t.isUnveiled) return false;
  if (!tileIsUnveiled(t.overlayTileID)) return false;
  return true;
}
function mapIsPositionInViewport(position) {
  const x = (position.x >> 8) - packedX(G.viewportPacked);
  const y = (position.y >> 8) - packedY(G.viewportPacked);
  return x >= -1 && x <= G.viewportTilesW && y >= -1 && y <= G.viewportTilesH;
}
function mapGetLandscapeType(packed) {
  const t = G.map[packed & 4095];
  let lst = iconLandscape[t.groundTileID & 511];
  if (iconLandscape[t.overlayTileID & 127] === LST.DESTROYED_WALL) lst = LST.DESTROYED_WALL;
  return lst < 0 ? LST.ENTIRELY_MOUNTAIN : lst;
}
function mapUpdateWall(packed) {
  if (mapGetLandscapeType(packed) !== LST.WALL) return false;
  const t = G.map[packed];
  t.groundTileID = G.mapTileID[packed] & 511;
  if (mapIsPositionUnveiled(packed)) t.overlayTileID = G.wallTileID;
  structureConnectWall(packed, true);
  return true;
}
function alertNearbyBaseDefenders(structure, attackerEncoded) {
  if (!structure || !houseAreAllied(structure.o.houseID, G.playerHouseID)) return;
  let attackerHouse = -1;
  const attacker = indexGetUnit(attackerEncoded);
  if (attacker?.o.flags.allocated) attackerHouse = unitGetHouseID(attacker);
  else if (indexGetType(attackerEncoded) === 3 /* STRUCTURE */) attackerHouse = indexGetStructure(attackerEncoded)?.o.houseID ?? -1;
  if (attackerHouse < 0 || houseAreAllied(attackerHouse, structure.o.houseID)) return;
  for (const defender of G.units) {
    if (!defender.o.flags.allocated || defender.o.flags.isNotOnMap || !houseAreAllied(unitGetHouseID(defender), structure.o.houseID)) continue;
    if (!unitInfo[defender.o.type].o.actionsPlayer.includes(ACTION.ATTACK)) continue;
    if (defender.patrolActive || defender.targetAttack !== 0 || defender.targetMove !== 0 || defender.speed !== 0) continue;
    if (defender.actionID !== ACTION.GUARD && defender.actionID !== ACTION.AREA_GUARD && defender.actionID !== ACTION.HUNT) continue;
    if (tileGetDistance(defender.o.position, structure.o.position) > 6 * 256) continue;
    unitSetAction(defender, ACTION.ATTACK);
    unitSetTarget(defender, attackerEncoded);
  }
}
function mapMakeExplosion(type, position, hitpoints, unitOriginEncoded, groundOnly = false) {
  const reactionDistance = type === EXPLOSION.DEATH_HAND ? 32 : 16;
  const positionPacked = packTile(position);
  if (hitpoints !== 0) {
    const find = findAll();
    for (; ; ) {
      const u = unitFind(find, unitGetHouseID);
      if (!u) break;
      const ui = unitInfo[u.o.type];
      if (groundOnly && ui.movementType === MOVEMENT.WINGER) continue;
      const distance2 = tileGetDistance(position, u.o.position) >> 4;
      if (distance2 >= reactionDistance) continue;
      if (!(u.o.type === UNIT.SANDWORM && type === EXPLOSION.SANDWORM_SWALLOW) && u.o.type !== UNIT.FRIGATE) {
        unitDamage(u, hitpoints >> (distance2 >> 2), 0);
      }
      const infantryAttacker = indexGetUnit(unitOriginEncoded);
      if (hitpoints >> (distance2 >> 2) > 0 && infantryAttacker && unitHarvesterDefend(u, infantryAttacker)) continue;
      if (u.o.houseID === G.playerHouseID) continue;
      let attackerHouse = -1;
      const us = indexGetUnit(unitOriginEncoded);
      if (us) {
        if (us === u) continue;
        attackerHouse = unitGetHouseID(us);
      } else if (indexGetType(unitOriginEncoded) === 3 /* STRUCTURE */) {
        const ss = indexGetStructure(unitOriginEncoded);
        if (ss) attackerHouse = ss.o.houseID;
      }
      if (attackerHouse < 0 || houseAreAllied(unitGetHouseID(u), attackerHouse)) continue;
      const t = unitGetTeam(u);
      if (t) {
        if (t.action === TEAM_ACTION.STAGING) {
          unitRemoveFromTeam(u);
          unitSetAction(u, ACTION.HUNT);
          continue;
        }
        const target = indexGetUnit(t.target);
        if (!target) continue;
        if (unitInfo[target.o.type].bulletType === UNIT.INVALID) t.target = unitOriginEncoded;
        continue;
      }
      if (u.o.type === UNIT.HARVESTER && us) {
        const uis = unitInfo[us.o.type];
        if (uis.movementType === MOVEMENT.FOOT && u.targetMove === 0) {
          if (u.actionID !== ACTION.MOVE) unitSetAction(u, ACTION.MOVE);
          u.targetMove = unitOriginEncoded;
          continue;
        }
      }
      if (ui.bulletType === UNIT.INVALID) continue;
      if (u.actionID === ACTION.GUARD && u.o.flags.byScenario) unitSetAction(u, ACTION.HUNT);
      if (u.targetAttack !== 0 && u.actionID !== ACTION.HUNT) continue;
      const attack = indexGetUnit(u.targetAttack);
      if (attack) {
        const packed = packTile(u.o.position);
        if (tileGetDistancePacked(indexGetPackedTile(u.targetAttack), packed) <= ui.fireDistance) continue;
      }
      unitSetTarget(u, unitOriginEncoded);
    }
  }
  if (hitpoints !== 0) {
    const s = structureGetByPackedTile(positionPacked);
    if (s) {
      if (type === EXPLOSION.IMPACT_LARGE) {
        const si = structureInfo[s.o.type];
        if (idiv(si.o.hitpoints, 2) > s.o.hitpoints) type = EXPLOSION.SMOKE_PLUME;
      }
      structureHouseUnderAttack(s.o.houseID);
      alertNearbyBaseDefenders(s, unitOriginEncoded);
      structureDamage(s, hitpoints, 0);
    }
  }
  if (mapGetLandscapeType(positionPacked) === LST.WALL && hitpoints !== 0) {
    const wallHp = structureInfo[STRUCTURE.WALL].o.hitpoints;
    if (wallHp <= hitpoints || random256() <= idiv(hitpoints * 256, wallHp)) mapUpdateWall(positionPacked);
  }
  explosionStart(type, position);
}
function mapDeviateArea(type, position, radius, houseID) {
  explosionStart(type, position);
  const find = findAll();
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (idiv(tileGetDistance(position, u.o.position), 16) >= radius) continue;
    unitDeviate(u, 0, houseID);
  }
}
function mapBloomExplodeSpice(packed, houseID) {
  if (G.validateStrictIfZero === 0) {
    unitRemove(unitGetByPackedTile(packed));
    G.map[packed].groundTileID = G.mapTileID[packed] & 511;
    mapMakeExplosion(EXPLOSION.SPICE_BLOOM_TREMOR, unpackTile(packed), 0, 0);
  }
  if (houseID === G.playerHouseID) G.onFeedback(36);
  mapFillCircleWithSpice(packed, 5);
}
function mapFillCircleWithSpice(packed, radius) {
  if (radius === 0) return;
  const x = packedX(packed);
  const y = packedY(packed);
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      const cur2 = packXY(x + j, y + i);
      const distance2 = tileGetDistancePacked(packed, cur2);
      if (distance2 > radius) continue;
      if (distance2 === radius && (random256() & 1) === 0) continue;
      if (mapGetLandscapeType(cur2) === LST.SPICE) continue;
      mapChangeSpiceAmount(cur2, 1);
    }
  }
  mapChangeSpiceAmount(packed, 1);
}
var landscapeIcon = (i) => G.iconGroups[9][i] & 511;
function mapFixupSpiceEdges(packed) {
  packed &= 4095;
  const type = mapGetLandscapeType(packed);
  let spriteID = 0;
  if (type === LST.SPICE || type === LST.THICK_SPICE) {
    for (let i = 0; i < 4; i++) {
      const cur2 = packed + tableMapDiff[i];
      if (isOutOfMap(cur2)) {
        spriteID |= 1 << i;
        continue;
      }
      const ct = mapGetLandscapeType(cur2);
      if (type === LST.SPICE) {
        if (ct === LST.SPICE || ct === LST.THICK_SPICE) spriteID |= 1 << i;
        continue;
      }
      if (ct === LST.THICK_SPICE) spriteID |= 1 << i;
    }
    spriteID += type === LST.SPICE ? 49 : 65;
    spriteID = landscapeIcon(spriteID);
    G.mapTileID[packed] |= 32768;
    G.map[packed].groundTileID = spriteID;
  }
}
function mapChangeSpiceAmount(packed, dir) {
  if (dir === 0) return;
  packed &= 65535;
  if (isOutOfMap(packed)) return;
  let type = mapGetLandscapeType(packed);
  if (type === LST.THICK_SPICE && dir > 0) return;
  if (type !== LST.SPICE && type !== LST.THICK_SPICE && dir < 0) return;
  if (type !== LST.NORMAL_SAND && type !== LST.ENTIRELY_DUNE && type !== LST.SPICE && dir > 0) return;
  if (dir > 0) type = type === LST.SPICE ? LST.THICK_SPICE : LST.SPICE;
  else type = type === LST.THICK_SPICE ? LST.SPICE : LST.NORMAL_SAND;
  if (type === LST.NORMAL_SAND) {
    G.mapTileID[packed] &= 32767;
    G.map[packed].groundTileID = G.mapTileID[packed] & 511;
  } else {
    let spriteID = type === LST.SPICE ? 49 : 65;
    spriteID = landscapeIcon(spriteID);
    G.mapTileID[packed] |= 32768;
    G.map[packed].groundTileID = spriteID;
  }
  mapFixupSpiceEdges(packed);
  mapFixupSpiceEdges(packed + 1);
  mapFixupSpiceEdges(packed - 1);
  mapFixupSpiceEdges(packed - 64);
  mapFixupSpiceEdges(packed + 64);
}
function mapFindLocationTile(locationID, houseID) {
  const mapBase = [1, -2, -2];
  const mi = mapInfo();
  const mapOffset = mapBase[G.mapScale];
  let ret = 0;
  if (locationID === 6) {
    const find = findAll();
    for (; ; ) {
      const s = structureFind(find);
      if (!s) break;
      if (s.o.type === STRUCTURE.SLAB_1x1 || s.o.type === STRUCTURE.SLAB_2x2 || s.o.type === STRUCTURE.WALL) continue;
      if (s.o.houseID === houseID) continue;
      houseID = s.o.houseID;
      break;
    }
  }
  for (let guard = 0; ret === 0 && guard < 1e3; guard++) {
    switch (locationID) {
      case 0:
        ret = packXY(mi.minX + randomRange(0, mi.sizeX - 2), mi.minY + mapOffset);
        break;
      case 1:
        ret = packXY(mi.minX + mi.sizeX - mapOffset, mi.minY + randomRange(0, mi.sizeY - 2));
        break;
      case 2:
        ret = packXY(mi.minX + randomRange(0, mi.sizeX - 2), mi.minY + mi.sizeY - mapOffset);
        break;
      case 3:
        ret = packXY(mi.minX + mapOffset, mi.minY + randomRange(0, mi.sizeY - 2));
        break;
      case 4:
        ret = packXY(mi.minX + randomRange(0, mi.sizeX), mi.minY + randomRange(0, mi.sizeY));
        if (houseID === G.playerHouseID && !mapIsValidPosition(ret)) ret = 0;
        break;
      case 5:
        ret = packXY(packedX(G.viewportPacked) + randomRange(0, 14), packedY(G.viewportPacked) + randomRange(0, 9));
        if (houseID === G.playerHouseID && !mapIsValidPosition(ret)) ret = 0;
        break;
      case 6:
      case 7: {
        const s = structureFind(findAll(houseID));
        if (s) {
          ret = packTile(tileMoveByRandom(s.o.position, 120, true));
        } else {
          const u = unitFind(findAll(houseID), unitGetHouseID);
          if (u) ret = packTile(tileMoveByRandom(u.o.position, 120, true));
          else ret = packXY(mi.minX + randomRange(0, mi.sizeX), mi.minY + randomRange(0, mi.sizeY));
        }
        if (houseID === G.playerHouseID && !mapIsValidPosition(ret)) ret = 0;
        break;
      }
      default:
        return 0;
    }
    ret &= 4095;
    if (ret !== 0 && objectGetByPackedTile(ret) !== null) ret = 0;
  }
  return ret;
}
function mapUpdateAround(radius, position, unit, fn) {
  const tileOffsets = [128, 136, 144, 152, 160, 168, 176, 184, 192, 200, 208, 216, 224, 232, 240, 248, 256, 384];
  if (radius === 0 || position.x === 0 && position.y === 0) return;
  radius--;
  const apply = (packed) => {
    if (fn === 2) unitRemoveFromTileFn(unit, packed);
    else if (fn === 3) unitAddToTileFn(unit, packed);
  };
  if (radius >= 32) {
    const x = posX(position);
    const y = posY(position);
    for (let i2 = -2; i2 <= 2; i2++) {
      for (let j = -2; j <= 2; j++) {
        if (x + i2 < 0 || x + i2 >= 64 || y + j < 0 || y + j >= 64) continue;
        apply(packXY(x + i2, y + j));
      }
    }
    return;
  }
  radius = Math.max(radius, 15);
  const pos = tile(position.x - tileOffsets[radius - 15], position.y - tileOffsets[radius - 15]);
  let diff = { x: 0, y: 0 };
  let lastPacked = 0;
  let i = 0;
  do {
    const cur2 = tileAddDiff(pos, diff);
    if (tileIsValid(cur2)) {
      const curPacked = packTile(cur2);
      if (curPacked !== lastPacked) {
        apply(curPacked);
        lastPacked = curPacked;
      }
    }
    if (i === 8) break;
    diff = tableTileDiff[radius + 1][i++];
  } while (diff.x !== 0 || diff.y !== 0);
}
function mapSearchSpice(packed, radius) {
  let radius1 = radius + 1;
  let radius2 = radius + 1;
  let packed1 = packed;
  let packed2 = packed;
  let found = false;
  const mi = mapInfo();
  const xmin = Math.max(packedX(packed) - radius, mi.minX);
  const xmax = Math.min(packedX(packed) + radius, mi.minX + mi.sizeX - 1);
  const ymin = Math.max(packedY(packed) - radius, mi.minY);
  const ymax = Math.min(packedY(packed) + radius, mi.minY + mi.sizeY - 1);
  for (let y = ymin; y <= ymax; y++) {
    for (let x = xmin; x <= xmax; x++) {
      const cur2 = packXY(x, y);
      if (!mapIsValidPosition(cur2)) continue;
      if (G.map[cur2].hasStructure) continue;
      if (unitGetByPackedTile(cur2) !== null) continue;
      const type = mapGetLandscapeType(cur2);
      const distance2 = tileGetDistancePacked(cur2, packed);
      if (type === LST.THICK_SPICE && distance2 < 4) {
        found = true;
        if (distance2 <= radius2) {
          radius2 = distance2;
          packed2 = cur2;
        }
      }
      if (type === LST.SPICE) {
        found = true;
        if (distance2 <= radius1) {
          radius1 = distance2;
          packed1 = cur2;
        }
      }
    }
  }
  if (!found) return 0;
  return radius2 <= radius ? packed2 : packed1;
}
function mapUnveilTileNeighbour(packed) {
  if (isOutOfMap(packed)) return;
  const t = G.map[packed];
  let tileID = 15;
  if (t.isUnveiled) {
    if (G.validateStrictIfZero === 0 && tileIsUnveiled(t.overlayTileID)) return;
    tileID = 0;
    for (let i = 0; i < 4; i++) {
      const n = packed + tableMapDiff[i];
      if (isOutOfMap(n) || !G.map[n].isUnveiled) tileID |= 1 << i;
    }
  }
  if (tileID !== 0) {
    if (tileID !== 15) {
      const u = unitGetByPackedTile(packed);
      if (u) unitHouseUnitCountAdd(u, G.playerHouseID);
    }
    tileID = G.iconGroups[7][tileID];
  }
  t.overlayTileID = tileID;
}
function mapUnveilTile(packed, houseID) {
  if (houseID !== G.playerHouseID) return false;
  if (isOutOfMap(packed)) return false;
  const t = G.map[packed];
  if (t.isUnveiled && tileIsUnveiled(t.overlayTileID)) return false;
  t.isUnveiled = true;
  const u = unitGetByPackedTile(packed);
  if (u) unitHouseUnitCountAdd(u, houseID);
  const s = structureGetByPackedTile(packed);
  if (s) {
    s.o.seenByHouses |= 1 << houseID;
    if (houseID === 1) s.o.seenByHouses |= 1 << 3;
  }
  mapUnveilTileNeighbour(packed);
  mapUnveilTileNeighbour(packed + 1);
  mapUnveilTileNeighbour(packed - 1);
  mapUnveilTileNeighbour(packed - 64);
  mapUnveilTileNeighbour(packed + 64);
  return true;
}
function tileRemoveFogInRadius(t, radius) {
  let packed = packTile(t);
  if (!mapIsValidPosition(packed)) return;
  const x = packedX(packed);
  const y = packedY(packed);
  const center2 = unpackTile(packXY(x, y));
  center2.x = x << 8 | 128;
  center2.y = y << 8 | 128;
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      if (x + i < 0 || x + i >= 64 || y + j < 0 || y + j >= 64) continue;
      packed = packXY(x + i, y + j);
      const tt = { x: x + i << 8 | 128, y: y + j << 8 | 128 };
      if (tileGetDistance(center2, tt) + 128 >> 8 > radius) continue;
      mapUnveilTile(packed, G.playerHouseID);
    }
  }
}
function tileGetTileInDirectionOf(from, to) {
  if (from === 0 || to === 0) return 0;
  const distance2 = tileGetDistancePacked(from, to);
  const direction = tileGetDirectionPacked(to, from);
  if (distance2 <= 10) return 0;
  for (let guard = 0; guard < 1e3; guard++) {
    let dir = 31 + (random256() & 63);
    if ((random256() & 1) !== 0) dir = -dir;
    const position = tileMoveByDirection(unpackTile(to), direction + dir, Math.min(distance2, 20) << 8);
    const packed = packTile(position);
    if (mapIsValidPosition(packed)) return packed;
  }
  return 0;
}

// web/src/engine/animation.ts
var ANIMATION_MAX = 112;
var ICONGROUP_BASE_DEFENSE_TURRET = 23;
var ICONGROUP_BASE_ROCKET_TURRET = 24;
var animations = Array.from({ length: ANIMATION_MAX }, () => ({ tickNext: 0, tileLayout: 0, houseID: 0, current: 0, iconGroup: 0, commands: null, tile: { x: 0, y: 0 } }));
var animationTimer = 0;
function animationInit() {
  for (const a of animations) a.commands = null;
  animationTimer = 0;
}
function funcStop2(a) {
  const layout = layoutTiles[a.tileLayout];
  const count = layoutTileCount[a.tileLayout];
  const packed = packTile(a.tile);
  G.map[packed].hasAnimation = false;
  a.commands = null;
  for (let i = 0; i < count; i++) {
    const position = packed + layout[i];
    const t = G.map[position];
    if (a.tileLayout !== 0) t.groundTileID = G.mapTileID[position] & 511;
    if (mapIsPositionUnveiled(position)) t.overlayTileID = 0;
  }
}
function funcAbort(a) {
  G.map[packTile(a.tile)].hasAnimation = false;
  a.commands = null;
}
function funcSetOverlayTile(a, parameter) {
  const packed = packTile(a.tile);
  const t = G.map[packed];
  if (!mapIsPositionUnveiled(packed)) return;
  t.overlayTileID = G.iconGroups[a.iconGroup][parameter] & 127;
  t.houseID = a.houseID;
}
function funcSetGroundTile(a, parameter) {
  const layout = layoutTiles[a.tileLayout];
  const count = layoutTileCount[a.tileLayout];
  const packed = packTile(a.tile);
  const group = G.iconGroups[a.iconGroup];
  const stride = structureFrameStride(a.iconGroup, count);
  let base = stride * parameter;
  if (base + count > group.length && !(a.iconGroup === ICONGROUP_BASE_DEFENSE_TURRET || a.iconGroup === ICONGROUP_BASE_ROCKET_TURRET)) {
    base = stride * 2;
    if (base + count > group.length) return;
  }
  let special = null;
  if (parameter > 1 && (a.iconGroup === ICONGROUP_BASE_DEFENSE_TURRET || a.iconGroup === ICONGROUP_BASE_ROCKET_TURRET)) {
    const s = structureGetByPackedTile(packed);
    if (s) special = s.rotationSpriteDiff + group[2];
  }
  for (let i = 0; i < count; i++) {
    const position = packed + layout[i];
    const tileID = special ?? group[base + i];
    const t = G.map[position];
    if (t.groundTileID === tileID) continue;
    t.groundTileID = tileID;
    t.houseID = a.houseID;
    if (mapIsPositionUnveiled(position)) t.overlayTileID = 0;
  }
}
function animationStart(commands, tile2, tileLayout, houseID, iconGroup) {
  const packed = packTile(tile2);
  const t = G.map[packed];
  animationStopByTile(packed);
  for (const a of animations) {
    if (a.commands !== null) continue;
    a.tickNext = G.timerGUI;
    a.tileLayout = tileLayout;
    a.houseID = houseID;
    a.current = 0;
    a.iconGroup = iconGroup;
    a.commands = commands;
    a.tile = { ...tile2 };
    animationTimer = 0;
    t.houseID = houseID;
    t.hasAnimation = true;
    return;
  }
}
function animationStopByTile(packed) {
  const t = G.map[packed];
  if (!t.hasAnimation) return;
  for (const a of animations) {
    if (a.commands === null) continue;
    if (packTile(a.tile) !== packed) continue;
    funcStop2(a);
    return;
  }
}
function animationTick() {
  if (animationTimer > G.timerGUI) return;
  animationTimer += 1e4;
  for (const a of animations) {
    if (a.commands === null) continue;
    if (a.tickNext <= G.timerGUI) {
      const [command, parameter] = a.commands[a.current] ?? [0 /* STOP */, 0];
      a.current = a.current + 1 & 255;
      switch (command) {
        case 1 /* ABORT */:
          funcAbort(a);
          break;
        case 2 /* SET_OVERLAY_TILE */:
          funcSetOverlayTile(a, parameter);
          break;
        case 3 /* PAUSE */:
          a.tickNext = G.timerGUI + parameter + random256() % 4;
          break;
        case 4 /* REWIND */:
          a.current = 0;
          break;
        case 5 /* PLAY_VOICE */:
          G.onSound(parameter, a.tile);
          break;
        case 6 /* SET_GROUND_TILE */:
          funcSetGroundTile(a, parameter);
          break;
        case 7 /* FORWARD */:
          a.current = a.current + parameter - 1 & 255;
          break;
        case 8 /* SET_ICONGROUP */:
          a.iconGroup = parameter;
          break;
        default:
          funcStop2(a);
          break;
      }
      if (a.commands === null) continue;
    }
    if (a.tickNext < animationTimer) animationTimer = a.tickNext;
  }
}

// web/src/engine/scriptfns.ts
var P = peek;
var cur = () => G.scriptCurrentUnit;
var curS = () => G.scriptCurrentStructure;
var curT = () => G.scriptCurrentTeam;
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function scriptText(script, index) {
  const text = script.scriptInfo?.text;
  if (!text || text.length < 2) return "";
  const off = text[index * 2] << 8 | text[index * 2 + 1];
  let s = "";
  for (let i = off; i < text.length && text[i]; i++) s += String.fromCharCode(text[i]);
  return s;
}
var generalDelay = (script) => {
  const delay = idiv(P(script, 1), 5);
  script.delay = delay;
  return delay;
};
var generalDelayRandom = (script) => {
  let delay = idiv(random256() * P(script, 1), 256);
  delay = idiv(delay, 5);
  script.delay = delay;
  return delay;
};
var generalGetDistanceToTile = (script) => {
  const encoded = P(script, 1);
  if (!indexIsValid(encoded)) return 65535;
  return tileGetDistance(G.scriptCurrentObject.position, indexGetTile(encoded));
};
var generalNoOperation = () => 0;
var generalDisplayText = (script) => {
  const text = scriptText(script, P(script, 1));
  if (text) G.onMessage(text, 0);
  return 0;
};
var generalRandomRange = (script) => randomRange(P(script, 1), P(script, 2));
var generalDisplayModalMessage = (script) => {
  const text = scriptText(script, P(script, 1));
  if (text) G.onMessage(text, 0);
  return 0;
};
var generalGetDistanceToObject = (script) => {
  const index = P(script, 1);
  if (!indexIsValid(index)) return 65535;
  return objectGetDistanceToEncoded(G.scriptCurrentObject, index);
};
var generalUnknown0288 = (script) => {
  const index = P(script, 1);
  const s = indexGetStructure(index);
  if (s && indexEncode(s.o.index, 3 /* STRUCTURE */) !== index) return 1;
  return indexGetObject(index) === null ? 1 : 0;
};
var generalGetOrientation = (script) => {
  const u = indexGetUnit(P(script, 1));
  if (!u) return 128;
  return u.orientation[0].current;
};
var generalUnitCount = (script) => {
  let count = 0;
  const find = findAll(G.scriptCurrentObject.houseID, P(script, 1));
  while (unitFind(find, unitGetHouseID)) count++;
  return count;
};
var generalDecodeIndex = (script) => {
  const index = P(script, 1);
  if (!indexIsValid(index)) return 65535;
  return indexDecode(index);
};
var generalGetIndexType = (script) => {
  const index = P(script, 1);
  if (!indexIsValid(index)) return 65535;
  return [0, 3, 1, 2][indexGetType(index)];
};
var generalGetLinkedUnitType = () => {
  const linkedID = G.scriptCurrentObject.linkedID;
  if (linkedID === 255) return 65535;
  return G.units[linkedID].o.type;
};
var generalVoicePlay = (script) => {
  G.onSound(P(script, 1), G.scriptCurrentObject.position);
  return 0;
};
var generalSearchSpice = (script) => {
  const packed = mapSearchSpice(packTile(G.scriptCurrentObject.position), P(script, 1));
  if (packed === 0) return 0;
  return indexEncode(packed, 1 /* TILE */);
};
var generalIsEnemy = (script) => {
  const index = P(script, 1);
  if (!indexIsValid(index)) return 0;
  const houseID = G.scriptCurrentUnit ? unitGetHouseID(G.scriptCurrentUnit) : G.scriptCurrentObject.houseID;
  switch (indexGetType(index)) {
    case 2 /* UNIT */:
      return unitGetHouseID(indexGetUnit(index)) !== houseID ? 1 : 0;
    case 3 /* STRUCTURE */:
      return indexGetStructure(index).o.houseID !== houseID ? 1 : 0;
    default:
      return 0;
  }
};
var generalIsFriendly = (script) => {
  const o = indexGetObject(P(script, 1));
  if (!o || o.flags.isNotOnMap || !o.flags.used) return 0;
  return generalIsEnemy(script) === 0 ? 1 : 65535;
};
var generalFindIdle = (script) => {
  const index = P(script, 1);
  const houseID = G.scriptCurrentObject.houseID;
  if (indexGetType(index) === 2 /* UNIT */) return 0;
  if (indexGetType(index) === 1 /* TILE */) return 0;
  if (indexGetType(index) === 3 /* STRUCTURE */) {
    const s = indexGetStructure(index);
    if (s.o.houseID !== houseID) return 0;
    if (s.state !== STATE.IDLE) return 0;
    return 1;
  }
  const find = findAll(houseID, index);
  for (; ; ) {
    const s = structureFind(find);
    if (!s) return 0;
    if (s.state !== STATE.IDLE) continue;
    return indexEncode(s.o.index, 3 /* STRUCTURE */);
  }
};
var MAP_DIRECTION = [-64, -63, 1, 65, 64, 63, -1, -65];
var unitRandomSoldier = (script) => {
  const u = cur();
  if (random256() >= unitInfo[u.o.type].o.spawnChance) return 0;
  const position = tileMoveByRandom(u.o.position, 20, true);
  const nu = unitCreate(INDEX_INVALID, UNIT.SOLDIER, u.o.houseID, position, random256());
  if (!nu) return 0;
  nu.deviated = u.deviated;
  unitSetAction(nu, P(script, 1));
  return 1;
};
var unitFindBestTarget = (script) => unitFindBestTargetEncoded(cur(), P(script, 1));
var unitGetTargetPriority = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  const target = indexGetUnit(encoded);
  if (target) return unitGetTargetUnitPriority(u, target);
  const s = indexGetStructure(encoded);
  if (!s) return 0;
  return unitGetTargetStructurePriority(u, s);
};
var unitTransportDeliver = (script) => {
  const u = cur();
  if (u.o.linkedID === 255) return 0;
  if (indexGetType(u.targetMove) === 2 /* UNIT */) return 0;
  if (u.o.type === UNIT.CARRYALL && !carryallReadyForService(u)) {
    unitSetSpeed(u, 0);
    script.delay = 2;
    script.pc--;
    return 0;
  }
  if (indexGetType(u.targetMove) === 3 /* STRUCTURE */) {
    const s = indexGetStructure(u.targetMove);
    const si = structureInfo[s.o.type];
    if (s.o.type === STRUCTURE.STARPORT) {
      let ret = 0;
      if (s.state === STATE.BUSY) {
        s.o.linkedID = u.o.linkedID;
        u.o.linkedID = 255;
        u.o.flags.inTransport = false;
        u.amount = 0;
        unitUpdateMap(2, u);
        G.onSound(24, u.o.position);
        structureSetState(s, STATE.READY);
        ret = 1;
      }
      objectScriptVariable4Clear(u.o);
      u.targetMove = 0;
      return ret;
    }
    if ((s.state === STATE.IDLE || si.o.flags.busyStateIsIncoming && s.state === STATE.BUSY) && s.o.linkedID === 255) {
      G.onSound(24, u.o.position);
      unitEnterStructure(G.units[u.o.linkedID], s);
      objectScriptVariable4Clear(u.o);
      u.targetMove = 0;
      u.o.linkedID = 255;
      u.o.flags.inTransport = false;
      u.amount = 0;
      unitUpdateMap(2, u);
      return 1;
    }
    objectScriptVariable4Clear(u.o);
    u.targetMove = 0;
    return 0;
  }
  if (!mapIsValidPosition(packTile(tileCenter(u.o.position)))) return 0;
  const u2 = G.units[u.o.linkedID];
  if (!unitSetPosition(u2, tileCenter(u.o.position))) return 0;
  if (u2.o.houseID === G.playerHouseID) G.onSound(24, u.o.position);
  unitSetOrientation(u2, u.orientation[0].current, true, 0);
  unitSetOrientation(u2, u.orientation[0].current, true, 1);
  unitSetSpeed(u2, 0);
  u.o.linkedID = u2.o.linkedID;
  u2.o.linkedID = 255;
  if (u.o.linkedID !== 255) return 1;
  u.o.flags.inTransport = false;
  objectScriptVariable4Clear(u.o);
  u.targetMove = 0;
  return 1;
};
var unitPickup = (script) => {
  const u = cur();
  if (u.o.linkedID !== 255) return 0;
  if (u.o.type === UNIT.CARRYALL && u.targetMove && !carryallReadyForService(u)) {
    unitSetSpeed(u, 0);
    script.delay = 2;
    script.pc--;
    return 0;
  }
  switch (indexGetType(u.targetMove)) {
    case 3 /* STRUCTURE */: {
      const s = indexGetStructure(u.targetMove);
      if (s.state !== STATE.READY) {
        objectScriptVariable4Clear(u.o);
        u.targetMove = 0;
        return 0;
      }
      u.o.flags.inTransport = true;
      objectScriptVariable4Clear(u.o);
      u.targetMove = 0;
      const u2 = G.units[s.o.linkedID];
      u.o.linkedID = u2.o.index & 255;
      s.o.linkedID = u2.o.linkedID;
      u2.o.linkedID = 255;
      if (s.o.linkedID === 255) structureSetState(s, STATE.IDLE);
      if (u2.targetLast.x !== 0 || u2.targetLast.y !== 0) {
        u.targetMove = indexEncode(packTile(u2.targetLast), 1 /* TILE */);
      } else if (u2.o.type === UNIT.HARVESTER && unitGetHouseID(u2) !== G.playerHouseID) {
        u.targetMove = indexEncode(mapSearchSpice(packTile(u.o.position), 20), 1 /* TILE */);
      }
      unitUpdateMap(2, u);
      return 1;
    }
    case 2 /* UNIT */: {
      const u2 = indexGetUnit(u.targetMove);
      if (!u2.o.flags.allocated) return 0;
      let s = null;
      let minDistance = 0;
      const find = findAll(unitGetHouseID(u));
      for (; ; ) {
        const s2 = structureFind(find);
        if (!s2) break;
        const distance2 = s16(tileGetDistanceRoundedUp(s2.o.position, u.o.position));
        if (u2.o.type === UNIT.HARVESTER) {
          if (s2.o.type !== STRUCTURE.REFINERY || s2.state !== STATE.IDLE || s2.o.script.variables[4] !== 0) continue;
          if (minDistance !== 0 && distance2 >= minDistance) break;
          minDistance = distance2;
          s = s2;
          break;
        }
        if (s2.o.type !== STRUCTURE.REPAIR || s2.state !== STATE.IDLE || s2.o.script.variables[4] !== 0) continue;
        if (minDistance !== 0 && distance2 >= minDistance) continue;
        minDistance = distance2;
        s = s2;
      }
      if (!s) return 0;
      if (u2 === G.unitSelected) unitSelect(null);
      u.o.linkedID = u2.o.index & 255;
      u.o.flags.inTransport = true;
      unitUpdateMap(0, u2);
      unitHide(u2);
      objectScriptVariable4Link(indexEncode(u.o.index, 2 /* UNIT */), indexEncode(s.o.index, 3 /* STRUCTURE */));
      u.targetMove = u.o.script.variables[4];
      unitUpdateMap(2, u);
      if (u2.o.type !== UNIT.HARVESTER) return 0;
      if (mapSearchSpice(packTile(u2.o.position), 2) === 0) {
        u2.targetPreLast = { x: 0, y: 0 };
        u2.targetLast = { x: 0, y: 0 };
      }
      return 0;
    }
    default:
      return 0;
  }
};
var unitStop = () => {
  const u = cur();
  unitSetSpeed(u, 0);
  unitUpdateMap(2, u);
  return 0;
};
var unitSetSpeedFn = (script) => {
  const u = cur();
  let speed = clamp(s16(P(script, 1)), 0, 255);
  if (!u.o.flags.byScenario) speed = idiv(speed * 192, 256);
  unitSetSpeed(u, speed);
  return u.speed;
};
var unitSetSprite = (script) => {
  const u = cur();
  u.spriteOffset = s8(-(P(script, 1) & 255));
  unitUpdateMap(2, u);
  return 0;
};
var unitMoveToTarget = (script) => {
  const u = cur();
  if (u.targetMove === 0) return 0;
  const t = unitDestinationTile(u, u.targetMove);
  const distance2 = tileGetDistance(u.o.position, t);
  if (s16(distance2) < 128) {
    unitSetSpeed(u, 0);
    u.o.position = {
      x: u16(u.o.position.x + clamp(s16(t.x - u.o.position.x), -16, 16)),
      y: u16(u.o.position.y + clamp(s16(t.y - u.o.position.y), -16, 16))
    };
    unitUpdateMap(2, u);
    if (s16(distance2) < 32) return 1;
    script.delay = 2;
    script.pc--;
    return 0;
  }
  const orientation = tileGetDirection(u.o.position, t);
  unitSetOrientation(u, orientation, false, 0);
  let diff = Math.abs(orientation - u.orientation[0].current);
  if (diff > 128) diff = 256 - diff;
  unitSetSpeed(u, idiv(Math.max(Math.min(idiv(distance2, 8), 255), 25) * (255 - diff) + 128, 256));
  const delay = Math.max(idiv(s16(distance2), 1024), 1);
  unitUpdateMap(2, u);
  if (delay !== 0) {
    script.delay = delay;
    script.pc--;
  }
  return 0;
};
var unitDie = () => {
  const u = cur();
  const ui = unitInfo[u.o.type];
  unitRemove(u);
  if (ui.movementType !== MOVEMENT.WINGER) {
    const credits = Math.max(idiv(ui.o.buildCredits, 100), 1);
    if (u.o.houseID === G.playerHouseID) {
      G.scenario.killedAllied++;
      G.scenario.score -= Math.min(credits, Math.max(0, G.scenario.score));
    } else {
      G.scenario.killedEnemy++;
      G.scenario.score += credits;
    }
  }
  unitHouseUnitCountRemove(u);
  if (u.o.type !== UNIT.SABOTEUR) return 0;
  mapMakeExplosion(EXPLOSION.SABOTEUR_DEATH, u.o.position, 300, 0);
  return 0;
};
var unitExplosionSingle = (script) => {
  const u = cur();
  mapMakeExplosion(P(script, 1), u.o.position, unitInfo[u.o.type].o.hitpoints, indexEncode(u.o.index, 2 /* UNIT */));
  return 0;
};
var unitExplosionMultiple = (script) => {
  const u = cur();
  mapMakeExplosion(EXPLOSION.DEATH_HAND, u.o.position, randomRange(25, 50), 0);
  for (let i = 0; i < 7; i++) {
    mapMakeExplosion(EXPLOSION.DEATH_HAND, tileMoveByRandom(u.o.position, P(script, 1), false), randomRange(75, 150), 0);
  }
  return 0;
};
function friendlyStructureOnRay(from, to, houseID) {
  let x = packTile(from) & 63;
  let y = packTile(from) >> 6;
  const endX = packTile(to) & 63;
  const endY = packTile(to) >> 6;
  const dx = Math.abs(endX - x);
  const sx = x < endX ? 1 : -1;
  const dy = -Math.abs(endY - y);
  const sy = y < endY ? 1 : -1;
  let error = dx + dy;
  while (x !== endX || y !== endY) {
    const twice = error * 2;
    if (twice >= dy) {
      error += dy;
      x += sx;
    }
    if (twice <= dx) {
      error += dx;
      y += sy;
    }
    if (x === endX && y === endY) break;
    const structure = structureGetByPackedTile(packXY(x, y));
    if (structure && houseAreAllied(structure.o.houseID, houseID)) return true;
  }
  return false;
}
function unitFindClearShotTile(unit, target) {
  const targetPosition = indexGetTile(target);
  const packedTarget = packTile(targetPosition);
  const targetX = packedTarget & 63;
  const targetY = packedTarget >> 6;
  const range = Math.max(1, unitInfo[unit.o.type].fireDistance);
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let y = Math.max(0, targetY - range); y <= Math.min(63, targetY + range); y++) {
    for (let x = Math.max(0, targetX - range); x <= Math.min(63, targetX + range); x++) {
      const packed = packXY(x, y);
      if (!mapIsValidPosition(packed) || structureGetByPackedTile(packed)) continue;
      if (unitGetTileEnterScore(unit, packed, 0) >= 256) continue;
      const point = tileCenter(unpackTile(packed));
      if (tileGetDistance(point, targetPosition) > range * 256) continue;
      if (friendlyStructureOnRay(point, targetPosition, unitGetHouseID(unit))) continue;
      const distance2 = tileGetDistance(unit.o.position, point);
      if (distance2 < bestDistance) {
        best = packed;
        bestDistance = distance2;
      }
    }
  }
  return best;
}
var unitFire = (script) => {
  const u = cur();
  const target = u.targetAttack;
  if (target === 0 || !indexIsValid(target)) return 0;
  if (u.o.type !== UNIT.SANDWORM && target === indexEncode(packTile(u.o.position), 1 /* TILE */)) u.targetAttack = 0;
  if (u.targetAttack !== target) {
    unitSetTarget(u, target);
    return 0;
  }
  const ui = unitInfo[u.o.type];
  const turret = ui.o.flags.hasTurret ? 1 : 0;
  if (u.o.type !== UNIT.SANDWORM && u.orientation[turret].speed !== 0) return 0;
  if (indexGetType(target) === 1 /* TILE */ && objectGetByPackedTile(indexGetPackedTile(target)) !== null) unitSetTarget(u, target);
  if (u.fireDelay !== 0) return 0;
  const distance2 = objectGetDistanceToEncoded(u.o, target);
  if (s16(ui.fireDistance << 8) < s16(distance2)) return 0;
  const tu = indexGetUnit(target);
  if (tu && unitInfo[tu.o.type].movementType === MOVEMENT.WINGER && !ui.o.flags.targetAir) return 0;
  if (u.o.type !== UNIT.SANDWORM && (indexGetType(target) !== 2 /* UNIT */ || unitInfo[tu.o.type].movementType !== MOVEMENT.WINGER)) {
    const orientation = tileGetDirection(u.o.position, indexGetTile(target));
    let diff = Math.abs(u.orientation[turret].current - orientation);
    if (ui.movementType === MOVEMENT.WINGER) diff = idiv(diff, 8);
    if (diff >= 8) return 0;
  }
  if (ui.bulletType !== UNIT.SANDWORM && ui.bulletType !== UNIT.INVALID && ui.movementType !== MOVEMENT.WINGER && friendlyStructureOnRay(u.o.position, indexGetTile(target), unitGetHouseID(u))) {
    if (u.speed === 0 && u.currentDestination.x === 0 && u.currentDestination.y === 0) {
      const detour = unitFindClearShotTile(u, target);
      if (detour !== 0) unitSetDestination(u, indexEncode(detour, 1 /* TILE */));
    }
    return 0;
  }
  if (u.o.type === UNIT.LASER_TANK) return fireLaser(u, target);
  let damage = ui.damage;
  let typeID = ui.bulletType;
  const fireTwice = ui.flags.firesTwice && u.o.hitpoints > idiv(ui.o.hitpoints, 2);
  if ((u.o.type === UNIT.TROOPERS || u.o.type === UNIT.TROOPER) && s16(distance2) > 512) typeID = UNIT.MISSILE_TROOPER;
  switch (typeID) {
    case UNIT.SANDWORM: {
      unitUpdateMap(0, u);
      const u2 = indexGetUnit(target);
      if (u2) {
        u.o.position = { ...u2.o.position };
        u2.o.script.variables[1] = 65535;
        unitRemovePlayer(u2);
        unitHouseUnitCountRemove(u2);
        unitRemove(u2);
      }
      mapMakeExplosion(ui.explosionType, u.o.position, 0, 0);
      G.onSound(63, u.o.position);
      unitUpdateMap(1, u);
      u.amount = u.amount - 1 & 255;
      script.delay = 12;
      if (s8(u.amount) < 1) unitSetAction(u, ACTION.DIE);
      break;
    }
    case UNIT.MISSILE_TROOPER:
    case UNIT.MISSILE_ROCKET:
    case UNIT.MISSILE_TURRET:
    case UNIT.MISSILE_DEVIATOR:
    case UNIT.BULLET:
    case UNIT.SONIC_BLAST: {
      if (typeID === UNIT.MISSILE_TROOPER) damage -= idiv(damage, 4);
      const bullet = unitCreateBullet(u.o.position, typeID, unitGetHouseID(u), damage, target);
      if (!bullet) return 0;
      bullet.originEncoded = indexEncode(u.o.index, 2 /* UNIT */);
      G.onUnitShot(u, bullet);
      if (typeID === UNIT.BULLET && (u.o.type === UNIT.TANK || u.o.type === UNIT.SIEGE_TANK)) {
        u.recoil = true;
        u.recoilShown = true;
      }
      G.onSound(ui.bulletSound, u.o.position);
      unitDeviationDecrease(u, 20);
      break;
    }
    default:
      break;
  }
  u.fireDelay = adjustToGameSpeed(ui.fireDelay * 2, 1, 65535, true);
  if (fireTwice) {
    u.o.flags.fireTwiceFlip = !u.o.flags.fireTwiceFlip;
    if (u.o.flags.fireTwiceFlip) u.fireDelay = adjustToGameSpeed(5, 1, 10, true);
  } else {
    u.o.flags.fireTwiceFlip = false;
  }
  u.fireDelay += random256() & 1;
  unitUpdateMap(2, u);
  return 1;
};
var unitSetOrientationFn = (script) => {
  const u = cur();
  unitSetOrientation(u, s8(P(script, 1)), false, 0);
  return u.orientation[0].current;
};
var unitRotate2 = () => {
  const u = cur();
  const ui = unitInfo[u.o.type];
  if (ui.movementType !== MOVEMENT.WINGER && (u.currentDestination.x !== 0 || u.currentDestination.y !== 0)) return 1;
  const index = ui.o.flags.hasTurret ? 1 : 0;
  if (u.orientation[index].speed !== 0) return 1;
  const current = u.orientation[index].current;
  if (!indexIsValid(u.targetAttack)) return 0;
  const orientation = tileGetDirection(u.o.position, indexGetTile(u.targetAttack));
  if (orientation === current) return 0;
  unitSetOrientation(u, orientation, false, index);
  return 1;
};
var unitGetOrientation = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  if (indexIsValid(encoded)) return tileGetDirection(u.o.position, indexGetTile(encoded));
  return u.orientation[0].current;
};
var unitSetDestinationFn = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  if (encoded === 0 || !indexIsValid(encoded)) {
    u.targetMove = 0;
    return 0;
  }
  if (u.o.type === UNIT.HARVESTER) {
    const s = indexGetStructure(encoded);
    if (!s) {
      u.targetMove = encoded;
      u.route[0] = 255;
      return 0;
    }
    if (s.o.script.variables[4] !== 0) return 0;
  }
  unitSetDestination(u, encoded);
  return 0;
};
var unitSetTargetFn = (script) => {
  const u = cur();
  const target = P(script, 1);
  if (target === 0 || !indexIsValid(target)) {
    u.targetAttack = 0;
    return 0;
  }
  const orientation = tileGetDirection(u.o.position, indexGetTile(target));
  u.targetAttack = target;
  if (!unitInfo[u.o.type].o.flags.hasTurret) {
    u.targetMove = target;
    unitSetOrientation(u, orientation, false, 0);
  }
  unitSetOrientation(u, orientation, false, 1);
  return u.targetAttack;
};
var unitSetActionFn = (script) => {
  const u = cur();
  const action = P(script, 1);
  if (u.o.houseID === G.playerHouseID && action === ACTION.HARVEST && u.nextActionID !== ACTION.INVALID) return 0;
  unitSetAction(u, action);
  return 0;
};
var unitSetActionDefault = () => {
  const u = cur();
  unitSetAction(u, unitInfo[u.o.type].o.actionsPlayer[3]);
  return 0;
};
var unitSetDestinationDirect = (script) => {
  const encoded = P(script, 1);
  if (!indexIsValid(encoded)) return 0;
  const u = cur();
  if (u.currentDestination.x === 0 && u.currentDestination.y === 0 || unitInfo[u.o.type].flags.isNormalUnit) {
    u.currentDestination = unitDestinationTile(u, encoded);
  }
  unitSetOrientation(u, tileGetDirection(u.o.position, u.currentDestination), false, 0);
  return 0;
};
var unitGetInfo = (script) => {
  const u = cur();
  const ui = unitInfo[u.o.type];
  const turret = ui.o.flags.hasTurret ? 1 : 0;
  switch (P(script, 1)) {
    case 0:
      return idiv(u.o.hitpoints * 256, ui.o.hitpoints);
    case 1:
      return indexIsValid(u.targetMove) ? u.targetMove : 0;
    case 2:
      return ui.fireDistance << 8;
    case 3:
      return u.o.index;
    case 4:
      return u.orientation[0].current;
    case 5:
      return u.targetAttack;
    case 6:
      if (u.originEncoded === 0 || u.o.type === UNIT.HARVESTER) unitFindClosestRefinery(u);
      return u.originEncoded;
    case 7:
      return u.o.type;
    case 8:
      return indexEncode(u.o.index, 2 /* UNIT */);
    case 9:
      return u.movingSpeed;
    case 10:
      return Math.abs(u.orientation[0].target - u.orientation[0].current);
    case 11:
      return u.currentDestination.x === 0 && u.currentDestination.y === 0 ? 0 : 1;
    case 12:
      return u.fireDelay === 0 ? 1 : 0;
    case 13:
      return ui.flags.explodeOnDeath;
    case 14:
      return unitGetHouseID(u);
    case 15:
      return u.o.flags.byScenario ? 1 : 0;
    case 16:
      return u.orientation[turret].current;
    case 17:
      return Math.abs(u.orientation[turret].target - u.orientation[turret].current);
    case 18:
      return (ui.movementType & 64) === 0 ? 0 : 1;
    case 19:
      return (u.o.seenByHouses & 1 << G.playerHouseID) === 0 ? 0 : 1;
    default:
      return 0;
  }
};
function pathScore(packed, orient8) {
  const u = G.scriptCurrentUnit;
  if (!u) return 0;
  let res = unitGetTileEnterScore(u, packed, orient8 << 5);
  if (res === -1) res = 256;
  return res;
}
var DIRECTION_OFFSET = [0, 0, 1, 2, 3, -2, -1, 0];
function pathSmoothen(data) {
  const b = data.buffer;
  b[data.routeSize] = 255;
  let packed = data.packed;
  if (data.routeSize > 1) {
    let to = 1;
    while (b[to] !== 255) {
      let from = to - 1;
      while (b[from] === 254 && from !== 0) from--;
      if (b[from] === 254) {
        to++;
        continue;
      }
      let direction = DIRECTION_OFFSET[b[to] - b[from] & 7];
      if (direction === 3) {
        b[from] = 254;
        b[to] = 254;
        to++;
        continue;
      }
      if (direction === 0) {
        packed = u16(packed + MAP_DIRECTION[b[from]]);
        to++;
        continue;
      }
      let dir;
      if ((b[from] & 1) !== 0) {
        dir = b[from] + (direction < 0 ? -1 : 1) & 7;
        if (Math.abs(direction) === 1) {
          if (pathScore(u16(packed + MAP_DIRECTION[dir]), dir) <= 255) {
            b[to] = dir;
            b[from] = dir;
          }
          packed = u16(packed + MAP_DIRECTION[b[from]]);
          to++;
          continue;
        }
      } else {
        dir = b[from] + direction & 7;
      }
      b[to] = dir;
      b[from] = 254;
      while (b[from] === 254 && from !== 0) from--;
      if (b[from] !== 254) packed = u16(packed + MAP_DIRECTION[b[from] + 4 & 7]);
      else packed = data.packed;
      direction = 0;
    }
  }
  packed = data.packed;
  data.score = 0;
  data.routeSize = 0;
  let w = 0;
  for (let r = 0; b[r] !== 255; r++) {
    if (b[r] === 254) continue;
    packed = u16(packed + MAP_DIRECTION[b[r]]);
    data.score += pathScore(packed, b[r]);
    data.routeSize++;
    b[w++] = b[r];
  }
  data.routeSize++;
  b[w] = 255;
}
function pathConnect(packedDst, data, searchDirection, directionStart) {
  let packedCur = data.packed;
  const b = data.buffer;
  let size = 0;
  while (size < 100) {
    let direction = directionStart;
    let packedNext;
    for (; ; ) {
      direction = direction + searchDirection & 7;
      if ((direction & 1) !== 0 && u16(packedCur + MAP_DIRECTION[direction + searchDirection & 7]) === packedDst) {
        direction = direction + searchDirection & 7;
        packedNext = u16(packedCur + MAP_DIRECTION[direction]);
        break;
      }
      if (direction === directionStart) return false;
      packedNext = u16(packedCur + MAP_DIRECTION[direction]);
      if (pathScore(packedNext, direction) <= 255) break;
    }
    b[size++] = direction;
    if (packedNext === packedDst) {
      b[size] = 255;
      data.routeSize = size;
      pathSmoothen(data);
      data.routeSize--;
      return true;
    }
    if (data.packed === packedNext) return false;
    directionStart = direction - searchDirection * 3 & 7;
    packedCur = packedNext;
  }
  return false;
}
function pathfinder(packedSrc, packedDst, bufferSize) {
  const res = { packed: packedSrc, score: 0, routeSize: 0, buffer: new Array(bufferSize + 2).fill(255) };
  res.buffer[0] = 255;
  bufferSize--;
  let packedCur = packedSrc;
  while (res.routeSize < bufferSize) {
    if (packedCur === packedDst) break;
    const direction = tileGetDirectionPacked(packedCur, packedDst) >> 5;
    let packedNext = u16(packedCur + MAP_DIRECTION[direction]);
    const score = pathScore(packedNext, direction);
    if (score <= 255) {
      res.buffer[res.routeSize++] = direction;
      res.score += score;
    } else {
      let foundCounterclockwise = false;
      let foundClockwise = false;
      const routes = [
        { packed: 0, score: 0, routeSize: 0, buffer: new Array(102).fill(255) },
        { packed: 0, score: 0, routeSize: 0, buffer: new Array(102).fill(255) }
      ];
      for (let guard = 0; guard < 4096; guard++) {
        if (packedNext === packedDst) break;
        let dir = tileGetDirectionPacked(packedNext, packedDst) >> 5;
        packedNext = u16(packedNext + MAP_DIRECTION[dir]);
        if (pathScore(packedNext, dir) > 255) continue;
        routes[1] = { packed: packedCur, score: 0, routeSize: 0, buffer: new Array(102).fill(255) };
        foundCounterclockwise = pathConnect(packedNext, routes[1], -1, direction);
        routes[0] = { packed: packedCur, score: 0, routeSize: 0, buffer: new Array(102).fill(255) };
        foundClockwise = pathConnect(packedNext, routes[0], 1, direction);
        if (foundCounterclockwise || foundClockwise) break;
        do {
          if (packedNext === packedDst) break;
          dir = tileGetDirectionPacked(packedNext, packedDst) >> 5;
          packedNext = u16(packedNext + MAP_DIRECTION[dir]);
        } while (pathScore(packedNext, dir) <= 255);
      }
      if (foundCounterclockwise || foundClockwise) {
        let best;
        if (!foundClockwise) best = routes[1];
        else if (!foundCounterclockwise) best = routes[0];
        else best = routes[routes[1].score < routes[0].score ? 1 : 0];
        const routeSize = Math.min(bufferSize - res.routeSize, best.routeSize);
        if (routeSize <= 0) break;
        for (let i = 0; i < routeSize; i++) res.buffer[res.routeSize + i] = best.buffer[i];
        res.routeSize += routeSize;
        res.score += best.score;
      } else {
        break;
      }
    }
    packedCur = packedNext;
  }
  if (res.routeSize < bufferSize) res.buffer[res.routeSize++] = 255;
  pathSmoothen(res);
  return res;
}
var unitCalculateRoute = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  if (u.currentDestination.x !== 0 || u.currentDestination.y !== 0 || !indexIsValid(encoded)) return 1;
  const packedSrc = packTile(u.o.position);
  const packedDst = packTile(unitDestinationTile(u, encoded));
  if (packedDst === packedSrc) {
    u.route[0] = 255;
    u.targetMove = 0;
    return 0;
  }
  if (u.route[0] === 255) {
    const res = pathfinder(packedSrc, packedDst, 40);
    const n = Math.min(res.routeSize, 14);
    for (let i = 0; i < n; i++) u.route[i] = res.buffer[i];
    if (u.route[0] === 255) {
      const refinery = indexGetStructure(encoded);
      if (u.o.type === UNIT.HARVESTER && refinery?.o.type === STRUCTURE.REFINERY && refinery.o.houseID === unitGetHouseID(u)) {
        objectScriptVariable4Clear(u.o);
        u.targetMove = 0;
        unitSetAction(u, ACTION.RETURN);
        return 1;
      }
      u.targetMove = 0;
      if (u.o.type === UNIT.SANDWORM) script.delay = 720;
    }
  } else {
    const distance2 = tileGetDistancePacked(packedDst, packedSrc);
    if (distance2 < 14) u.route[distance2] = 255;
  }
  if (u.route[0] === 255) return 1;
  if (u.orientation[0].current !== s8(u.route[0] * 32)) {
    unitSetOrientation(u, s8(u.route[0] * 32), false, 0);
    return 1;
  }
  if (!unitStartMovement(u)) {
    u.route[0] = 255;
    return 0;
  }
  for (let i = 0; i < 13; i++) u.route[i] = u.route[i + 1];
  u.route[13] = 255;
  return 1;
};
var unitMoveToStructure = (script) => {
  const u = cur();
  if (u.o.linkedID !== 255) {
    const s = indexGetStructure(G.units[u.o.linkedID].originEncoded);
    if (s && s.state === STATE.IDLE && s.o.script.variables[4] === 0) {
      const encoded = indexEncode(s.o.index, 3 /* STRUCTURE */);
      objectScriptVariable4Link(indexEncode(u.o.index, 2 /* UNIT */), encoded);
      u.targetMove = u.o.script.variables[4];
      return encoded;
    }
  }
  const find = findAll(unitGetHouseID(u), P(script, 1));
  for (; ; ) {
    const s = structureFind(find);
    if (!s) break;
    if (s.state !== STATE.IDLE) continue;
    if (s.o.script.variables[4] !== 0) continue;
    const encoded = indexEncode(s.o.index, 3 /* STRUCTURE */);
    objectScriptVariable4Link(indexEncode(u.o.index, 2 /* UNIT */), encoded);
    u.targetMove = encoded;
    return encoded;
  }
  return 0;
};
var unitGetAmount = () => {
  const u = cur();
  if (u.o.linkedID === 255) return u.amount;
  return G.units[u.o.linkedID].amount;
};
var unitIsInTransport = () => cur().o.flags.inTransport ? 1 : 0;
var unitStartAnimation = () => {
  return 1;
};
var unitCallUnitByTypeFn = (script) => {
  const u = cur();
  if (u.o.script.variables[4] !== 0) return u.o.script.variables[4];
  if (!unitInfo[u.o.type].o.flags.canBePickedUp || u.deviated !== 0) return 0;
  const encoded = indexEncode(u.o.index, 2 /* UNIT */);
  const u2 = unitCallUnitByType(P(script, 1), unitGetHouseID(u), encoded, harvesterNeedsLift(u));
  if (!u2) return 0;
  const encoded2 = indexEncode(u2.o.index, 2 /* UNIT */);
  objectScriptVariable4Link(encoded, encoded2);
  u2.targetMove = encoded;
  return encoded2;
};
var unitUnknown2552 = () => {
  const u = cur();
  if (u.o.script.variables[4] === 0) return 0;
  const u2 = indexGetUnit(u.o.script.variables[4]);
  if (!u2 || u2.o.type !== UNIT.CARRYALL) return 0;
  objectScriptVariable4Clear(u.o);
  u2.targetMove = 0;
  return 0;
};
var unitFindStructure = (script) => {
  const u = cur();
  const find = findAll(unitGetHouseID(u), P(script, 1));
  for (; ; ) {
    const s = structureFind(find);
    if (!s) break;
    if (s.state !== STATE.IDLE) continue;
    if (s.o.linkedID !== 255) continue;
    if (s.o.script.variables[4] !== 0) continue;
    return indexEncode(s.o.index, 3 /* STRUCTURE */);
  }
  return 0;
};
var unitDisplayDestroyedText = () => {
  const u = cur();
  G.onMessage(msg.destroyed(unitGetHouseID(u), u.o.type, false), 0);
  return 0;
};
var unitRemoveFogFn = () => {
  unitRemoveFog(cur());
  return 0;
};
var unitHarvest = () => {
  const u = cur();
  if (u.o.type !== UNIT.HARVESTER) return 0;
  if (u.amount >= 100) return 0;
  const packed = packTile(u.o.position);
  const type = mapGetLandscapeType(packed);
  if (type !== LST.SPICE && type !== LST.THICK_SPICE) return 0;
  u.amount += random256() & 1;
  u.o.flags.inTransport = true;
  unitUpdateMap(2, u);
  if (u.amount > 100) u.amount = 100;
  if (G.infiniteSpice) return 1;
  if ((random256() & 31) !== 0) return 1;
  mapChangeSpiceAmount(packed, -1);
  return 0;
};
var unitIsValidDestination = (script) => {
  const u = cur();
  const encoded = P(script, 1);
  const index = indexDecode(encoded);
  switch (indexGetType(encoded)) {
    case 1 /* TILE */: {
      if (!mapIsValidPosition(index)) return 1;
      if (u.o.linkedID === 255) return 1;
      const u2 = G.units[u.o.linkedID];
      u2.o.position = indexGetTile(encoded);
      if (!unitIsTileOccupied(u2)) return 0;
      u2.o.position = { x: 65535, y: 65535 };
      return 1;
    }
    case 3 /* STRUCTURE */: {
      const s = G.structures[index];
      if (s.o.houseID === unitGetHouseID(u)) return 0;
      if (u.o.linkedID === 255) return 1;
      const u2 = G.units[u.o.linkedID];
      return unitIsValidMovementIntoStructure(u2, s) !== 0 ? 1 : 0;
    }
    default:
      return 1;
  }
};
var unitGetRandomTile = (script) => {
  const u = cur();
  if (indexGetType(P(script, 1)) !== 1 /* TILE */) return 0;
  const t = tileMoveByRandom(u.o.position, 80, true);
  return indexEncode(packTile(t), 1 /* TILE */);
};
var unitIdleAction = () => {
  const u = cur();
  const random = randomRange(0, 10);
  const movementType = unitInfo[u.o.type].movementType;
  if (movementType !== MOVEMENT.FOOT && movementType !== MOVEMENT.TRACKED && movementType !== MOVEMENT.WHEELED) return 0;
  if (movementType === MOVEMENT.FOOT && random > 8) {
    u.spriteOffset = random256() & 63;
    unitUpdateMap(2, u);
  }
  if (random > 2) return 0;
  const i = (random256() & 1) === 0 ? 1 : 0;
  unitSetOrientation(u, random256(), false, i);
  return 0;
};
var unitGoToClosestStructure = (script) => {
  const u = cur();
  let s = null;
  let distanceMin = 0;
  const find = findAll(unitGetHouseID(u), P(script, 1));
  for (; ; ) {
    const s2 = structureFind(find);
    if (!s2) break;
    if (s2.state !== STATE.IDLE) continue;
    if (s2.o.linkedID !== 255) continue;
    if (s2.o.script.variables[4] !== 0) continue;
    const distance2 = tileGetDistanceRoundedUp(s2.o.position, u.o.position);
    if (distance2 >= distanceMin && distanceMin !== 0) continue;
    distanceMin = distance2;
    s = s2;
  }
  if (!s) return 0;
  if (u.o.type === UNIT.HARVESTER && s.o.type === STRUCTURE.REFINERY && harvesterNeedsLift(u, s)) {
    const encoded = indexEncode(u.o.index, 2 /* UNIT */);
    const plane = unitCallUnitByType(UNIT.CARRYALL, unitGetHouseID(u), encoded, true);
    if (plane) {
      objectScriptVariable4Link(encoded, indexEncode(plane.o.index, 2 /* UNIT */));
      return 1;
    }
  }
  unitSetAction(u, ACTION.MOVE);
  unitSetDestination(u, indexEncode(s.o.index, 3 /* STRUCTURE */));
  return 1;
};
function harvesterNeedsLift(u, refinery) {
  if (u.o.type !== UNIT.HARVESTER) return false;
  let s = refinery;
  if (!s) {
    let nearest = Infinity;
    for (const candidate of G.structureFind) {
      if (candidate.o.type !== STRUCTURE.REFINERY || candidate.o.houseID !== unitGetHouseID(u) || candidate.o.flags.isNotOnMap || candidate.o.linkedID !== 255 || candidate.o.script.variables[4] !== 0) continue;
      const distance2 = tileGetDistance(u.o.position, candidate.o.position);
      if (distance2 < nearest) {
        nearest = distance2;
        s = candidate;
      }
    }
  }
  if (!s) return false;
  const exit = packTile(refineryExit(s.o.position));
  if (unitGetTileEnterScore(u, exit, 0) > 255) return true;
  const queue = new Uint16Array(4096), seen = new Uint8Array(4096);
  let head = 0, tail = 1;
  queue[0] = packTile(u.o.position);
  seen[queue[0]] = 1;
  while (head < tail) {
    const p = queue[head++];
    if (p === exit) return false;
    const x = p & 63, y = p >> 6;
    for (let direction = 0; direction < 8; direction++) {
      const nx = x + [0, 1, 1, 1, 0, -1, -1, -1][direction], ny = y + [-1, -1, 0, 1, 1, 1, 0, -1][direction];
      if (nx < 0 || nx > 63 || ny < 0 || ny > 63) continue;
      const next = packXY(nx, ny);
      if (seen[next] || !mapIsValidPosition(next) || structureGetByPackedTile(next) || unitGetTileEnterScore(u, next, direction) > 255) continue;
      seen[next] = 1;
      queue[tail++] = next;
    }
  }
  return true;
}
var MCV_OFFSETS = [0, -1, -64, -65];
var unitMCVDeploy = () => {
  const u = cur();
  unitUpdateMap(0, u);
  for (let i = 0; i < 4; i++) {
    const s = structureCreate(INDEX_INVALID, STRUCTURE.CONSTRUCTION_YARD, unitGetHouseID(u), u16(packTile(u.o.position) + MCV_OFFSETS[i]));
    if (s) {
      unitRemove(u);
      return 1;
    }
  }
  if (unitGetHouseID(u) === G.playerHouseID) G.onMessage(msg.unableToDeploy, 0);
  unitUpdateMap(1, u);
  return 0;
};
var unitSandwormGetBestTarget = () => {
  const u2 = unitSandwormFindBestTarget(cur());
  if (!u2) return 0;
  return indexEncode(u2.o.index, 2 /* UNIT */);
};
var unitUnknown2BD5 = () => {
  const u = cur();
  switch (indexGetType(u.o.script.variables[4])) {
    case 2 /* UNIT */: {
      const u2 = indexGetUnit(u.o.script.variables[4]);
      if (indexEncode(u.o.index, 2 /* UNIT */) === u2.o.script.variables[4] && u2.o.houseID === u.o.houseID) return 1;
      u2.targetMove = 0;
      break;
    }
    case 3 /* STRUCTURE */: {
      const s = indexGetStructure(u.o.script.variables[4]);
      if (indexEncode(u.o.index, 2 /* UNIT */) === s.o.script.variables[4] && s.o.houseID === u.o.houseID) return 1;
      break;
    }
  }
  objectScriptVariable4Clear(u.o);
  return 0;
};
var unitBlink = () => {
  cur().blinkCounter = 32;
  return 0;
};
var structureGetState = () => curS().state;
var structureSetStateFn = (script) => {
  const s = curS();
  let state = s16(P(script, 1));
  if (state === STATE.DETECT) {
    if (s.o.linkedID === 255) state = STATE.IDLE;
    else state = s.countDown === 0 ? STATE.READY : STATE.BUSY;
  }
  structureSetState(s, state);
  return 0;
};
var structureRemoveFogAroundTile = () => {
  structureRemoveFog(curS());
  return 0;
};
var structureRefineSpice = () => {
  const s = curS();
  if (s.o.linkedID === 255) {
    structureSetState(s, STATE.IDLE);
    return 0;
  }
  const u = G.units[s.o.linkedID];
  const si = structureInfo[s.o.type];
  let harvesterStep = idiv(idiv(s.o.hitpoints * 256, si.o.hitpoints) * 3, 256);
  if (u.amount < harvesterStep) harvesterStep = u.amount;
  if (u.amount !== 0 && harvesterStep < 1) harvesterStep = 1;
  if (harvesterStep === 0) return 0;
  let creditsStep = 7;
  if (u.o.houseID !== G.playerHouseID) creditsStep += random256() % 4 - 1;
  creditsStep *= harvesterStep;
  if (houseAreAllied(G.playerHouseID, s.o.houseID)) {
    G.scenario.harvestedAllied = Math.min(G.scenario.harvestedAllied + creditsStep, 65e3);
  } else {
    G.scenario.harvestedEnemy = Math.min(G.scenario.harvestedEnemy + creditsStep, 65e3);
  }
  G.houses[s.o.houseID].credits += creditsStep;
  u.amount -= harvesterStep;
  if (u.amount === 0) u.o.flags.inTransport = false;
  s.o.script.delay = 6;
  return 1;
};
var structureUnknown0A81 = () => {
  const s = curS();
  const structureIndex = indexEncode(s.o.index, 3 /* STRUCTURE */);
  const u = indexGetUnit(s.o.script.variables[4]);
  if (u) {
    if (structureIndex === u.o.script.variables[4]) return s.o.script.variables[4];
    objectScriptVariable4Clear(u.o);
  }
  objectScriptVariable4Clear(s.o);
  return 0;
};
var structureFindUnitByType = (script) => {
  const s = curS();
  if (s.state !== STATE.READY) return 0 /* NONE */;
  if (s.o.linkedID === 255) return 0 /* NONE */;
  const type = P(script, 1);
  const u = G.units[s.o.linkedID];
  const position = structureGroundExit(s, u, false);
  if (G.playerHouseID === s.o.houseID && u.o.type === UNIT.HARVESTER && u.targetLast.x === 0 && u.targetLast.y === 0 && position !== 0) return 0 /* NONE */;
  const carryall = unitCallUnitByType(type, s.o.houseID, indexEncode(s.o.index, 3 /* STRUCTURE */), position === 0);
  if (!carryall) return 0 /* NONE */;
  const carryallIndex = indexEncode(carryall.o.index, 2 /* UNIT */);
  objectScriptVariable4Set(s.o, carryallIndex);
  return carryallIndex;
};
function structureGroundExit(s, u, checkForSpice) {
  if (s.o.type === STRUCTURE.REFINERY && u.o.type === UNIT.HARVESTER) {
    const exit = packTile(refineryExit(s.o.position));
    return mapIsValidPosition(exit) && unitGetTileEnterScore(u, exit, 0) <= 255 ? exit : 0;
  }
  return structureFindFreePosition(s, checkForSpice);
}
var structureUnknown0C5A = () => {
  const s = curS();
  if (s.o.linkedID === 255) return 0;
  const u = G.units[s.o.linkedID];
  if (unitInfo[u.o.type].movementType === MOVEMENT.WINGER && unitSetPosition(u, s.o.position)) {
    if (u.o.type === UNIT.COMBAT_DRONE) initializeDrone(u, s);
    s.o.linkedID = u.o.linkedID;
    u.o.linkedID = 255;
    if (s.o.linkedID === 255) structureSetState(s, STATE.IDLE);
    objectScriptVariable4Clear(s.o);
    if (s.o.houseID === G.playerHouseID) G.onFeedback(1);
    return 1;
  }
  const position = structureGroundExit(s, u, u.o.type === UNIT.HARVESTER);
  if (position === 0) return 0;
  u.o.seenByHouses |= s.o.seenByHouses;
  const t = tileCenter(unpackTile(position));
  if (!unitSetPosition(u, t)) return 0;
  if (s.o.type === STRUCTURE.REFINERY && u.o.type === UNIT.HARVESTER) {
    const last = packTile(u.targetLast), kind = mapGetLandscapeType(last);
    const field = (u.targetLast.x || u.targetLast.y) && (kind === LST.SPICE || kind === LST.THICK_SPICE) ? last : mapSearchSpice(packTile(u.o.position), 64);
    if (field) {
      u.targetLast = tileCenter(unpackTile(field));
      unitSetAction(u, ACTION.HARVEST);
      unitSetDestination(u, indexEncode(field, 1 /* TILE */));
    }
  }
  s.o.linkedID = u.o.linkedID;
  u.o.linkedID = 255;
  unitSetOrientation(u, tileGetDirection(s.o.position, u.o.position) & 224, true, 0);
  unitSetOrientation(u, u.orientation[0].current, true, 1);
  if (u.o.houseID === G.playerHouseID && u.o.type === UNIT.HARVESTER) G.onMessage(msg.searchSpice, 1);
  if (s.o.linkedID === 255) structureSetState(s, STATE.IDLE);
  objectScriptVariable4Clear(s.o);
  if (s.o.houseID !== G.playerHouseID) return 1;
  if (s.o.type === STRUCTURE.REPAIR) return 1;
  G.onFeedback(1);
  return 1;
};
var structureFindTargetUnit = (script) => {
  const s = curS();
  const targetRange = P(script, 1);
  const distanceCurrent = 32e3;
  let u = null;
  const position = s.o.position;
  const find = findAll();
  for (; ; ) {
    const uf = unitFind(find, unitGetHouseID);
    if (!uf) break;
    if (houseAreAllied(s.o.houseID, unitGetHouseID(uf))) continue;
    if (uf.o.type !== UNIT.ORNITHOPTER && (uf.o.seenByHouses & 1 << s.o.houseID) === 0) continue;
    const distance2 = tileGetDistance(uf.o.position, position);
    if (distance2 >= distanceCurrent) continue;
    if (uf.o.type === UNIT.ORNITHOPTER) {
      if (distance2 >= targetRange * 3) continue;
    } else if (distance2 >= targetRange) continue;
    u = uf;
  }
  if (!u) return 0 /* NONE */;
  return indexEncode(u.o.index, 2 /* UNIT */);
};
var structureRotateTurret = (script) => {
  const encoded = P(script, 1);
  if (encoded === 0) return 0;
  const s = curS();
  const lookAt = indexGetTile(encoded);
  const t = G.map[packTile(s.o.position)];
  const baseTileID = G.iconGroups[s.o.type === STRUCTURE.ROCKET_TURRET ? 24 : 23][2];
  let rotation = t.groundTileID - baseTileID;
  if (rotation < 0 || rotation > 7) return 1;
  const rotationNeeded = orientation8(tileGetDirection(s.o.position, lookAt));
  if (rotationNeeded === rotation) return 0;
  let rotateDiff = rotationNeeded - rotation;
  if (rotateDiff < 0) rotateDiff += 8;
  if (rotateDiff < 4) rotation++;
  else rotation--;
  rotation &= 7;
  t.groundTileID = baseTileID + rotation;
  s.rotationSpriteDiff = rotation;
  return 1;
};
var structureGetDirection = (script) => {
  const s = curS();
  const encoded = P(script, 1);
  if (!indexIsValid(encoded)) return s.rotationSpriteDiff << 5;
  return orientation8(tileGetDirection(s.o.position, indexGetTile(encoded))) << 5;
};
var structureUnknown11B9 = (script) => {
  const encoded = P(script, 1);
  if (!indexIsValid(encoded)) return 0;
  if (indexGetType(encoded) !== 2 /* UNIT */) return 0;
  const u = indexGetUnit(encoded);
  if (!u) return 0;
  objectScriptVariable4Clear(u.o);
  u.targetMove = 0;
  return 0;
};
var structureVoicePlay = (script) => {
  const s = curS();
  if (s.o.houseID !== G.playerHouseID) return 0;
  G.onSound(P(script, 1), s.o.position);
  return 0;
};
var structureFire = (script) => {
  const s = curS();
  const target = script.variables[2];
  if (target === 0) return 0;
  let type;
  let damage;
  let fireDelay;
  if (s.o.type === STRUCTURE.ROCKET_TURRET && tileGetDistance(indexGetTile(target), s.o.position) >= 768) {
    type = UNIT.MISSILE_TURRET;
    damage = 30;
    fireDelay = adjustToGameSpeed(unitInfo[UNIT.LAUNCHER].fireDelay, 1, 65535, true);
  } else {
    type = UNIT.BULLET;
    damage = 20;
    fireDelay = adjustToGameSpeed(unitInfo[UNIT.TANK].fireDelay, 1, 65535, true);
  }
  const position = tile(s.o.position.x + 128, s.o.position.y + 128);
  const u = unitCreateBullet(position, type, s.o.houseID, damage, target);
  if (!u) return 0;
  u.originEncoded = indexEncode(s.o.index, 3 /* STRUCTURE */);
  return fireDelay;
};
var structureExplode = () => {
  const s = curS();
  const layout = structureInfo[s.o.type].layout;
  const position = packTile(s.o.position);
  for (let i = 0; i < layoutTileCount[layout]; i++) {
    mapMakeExplosion(EXPLOSION.STRUCTURE, unpackTile(position + layoutTiles[layout][i]), 0, 0);
  }
  return 0;
};
var structureDestroyFn = () => {
  const s = curS();
  const layout = structureInfo[s.o.type].layout;
  const position = packTile(s.o.position);
  structureRemove(s);
  for (let i = 0; i < layoutTileCount[layout]; i++) {
    let t = unpackTile(position + layoutTiles[layout][i]);
    if (structureInfo[s.o.type].o.spawnChance < random256()) continue;
    const u = unitCreate(INDEX_INVALID, UNIT.SOLDIER, s.o.houseID, t, random256());
    if (!u) continue;
    u.o.hitpoints = idiv(unitInfo[UNIT.SOLDIER].o.hitpoints * (random256() & 3), 256);
    if (s.o.houseID !== G.playerHouseID) {
      unitSetAction(u, ACTION.ATTACK);
      continue;
    }
    unitSetAction(u, ACTION.MOVE);
    t = tileMoveByRandom(u.o.position, 32, true);
    u.targetMove = indexEncode(packTile(t), 1 /* TILE */);
  }
  if (s.o.houseID !== G.playerHouseID) return 0;
  G.onMessage(msg.destroyed(s.o.houseID, s.o.type, true), 0);
  return 0;
};
var teamGetMembers = () => curT().members;
var teamGetVariable6 = () => curT().minMembers;
var teamGetTarget = () => curT().target;
var teamAddClosestUnit = () => {
  const t = curT();
  if (t.members >= t.maxMembers) return 0;
  let closest = null;
  let closest2 = null;
  let minDistance = 0;
  let minDistance2 = 0;
  const find = findAll(t.houseID);
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (!u.o.flags.byScenario) continue;
    if (u.o.type === UNIT.SABOTEUR) continue;
    if (unitInfo[u.o.type].movementType !== t.movementType) continue;
    if (u.team === 0) {
      const distance3 = tileGetDistance(t.position, u.o.position);
      if (distance3 >= minDistance && minDistance !== 0) continue;
      minDistance = distance3;
      closest = u;
      continue;
    }
    const t2 = G.teams[u.team - 1];
    if (t2.members > t2.minMembers) continue;
    const distance2 = tileGetDistance(t.position, u.o.position);
    if (distance2 >= minDistance2 && minDistance2 !== 0) continue;
    minDistance2 = distance2;
    closest2 = u;
  }
  if (!closest) closest = closest2;
  if (!closest) return 0;
  unitRemoveFromTeam(closest);
  return unitAddToTeam(closest, t);
};
var teamGetAverageDistance = () => {
  const t = curT();
  let averageX = 0;
  let averageY = 0;
  let count = 0;
  let distance2 = 0;
  let find = findAll(t.houseID);
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (t.index !== u.team - 1) continue;
    count++;
    averageX += u.o.position.x >> 8 & 63;
    averageY += u.o.position.y >> 8 & 63;
  }
  if (count === 0) return 0;
  averageX = idiv(averageX, count);
  averageY = idiv(averageY, count);
  t.position = { x: averageX << 8 | 128, y: averageY << 8 | 128 };
  find = findAll(t.houseID);
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (t.index !== u.team - 1) continue;
    distance2 += tileGetDistanceRoundedUp(u.o.position, t.position);
  }
  distance2 = idiv(distance2, count);
  if (t.target === 0 || t.targetTile === 0) return distance2;
  if (tileGetDistancePacked(packXY(averageX, averageY), indexGetPackedTile(t.target)) <= 10) t.targetTile = 2;
  return distance2;
};
var teamUnknown0543 = (script) => {
  const t = curT();
  let count = 0;
  const distance2 = P(script, 1);
  const find = findAll(t.houseID);
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (t.index !== u.team - 1) continue;
    let tl = indexGetTile(u.targetMove);
    const distanceUnitTeam = tileGetDistanceRoundedUp(u.o.position, t.position);
    let distanceUnitDest;
    let distanceTeamDest;
    if (u.targetMove !== 0) {
      distanceUnitDest = tileGetDistanceRoundedUp(u.o.position, tl);
      distanceTeamDest = tileGetDistanceRoundedUp(t.position, tl);
    } else {
      distanceUnitDest = 64;
      distanceTeamDest = 64;
    }
    if (distanceUnitDest < distanceTeamDest && distance2 + 2 < distanceUnitTeam || distanceUnitDest >= distanceTeamDest && distanceUnitTeam > distance2) {
      unitSetAction(u, ACTION.MOVE);
      tl = tileMoveByRandom(t.position, distance2 << 4, true);
      unitSetDestination(u, indexEncode(packTile(tl), 1 /* TILE */));
      count++;
      continue;
    }
    unitSetAction(u, ACTION.GUARD);
  }
  return count;
};
var teamFindBestTarget = () => {
  const t = curT();
  const find = findAll(t.houseID);
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.team - 1 !== t.index) continue;
    const target = unitFindBestTargetEncoded(u, t.action === TEAM_ACTION.KAMIKAZE ? 4 : 0);
    if (target === 0) continue;
    if (t.target === target) return target;
    t.target = target;
    t.targetTile = tileGetTileInDirectionOf(packTile(u.o.position), indexGetPackedTile(target));
    return target;
  }
  return 0;
};
var teamLoad = (script) => {
  const t = curT();
  const type = P(script, 1);
  if (t.action === type) return 0;
  t.action = type;
  scriptReset(t.script, G.scriptTeam);
  scriptLoad(t.script, type & 255);
  return 0;
};
var teamLoad2 = () => {
  const t = curT();
  const type = t.actionStart;
  if (t.action === type) return 0;
  t.action = type;
  scriptReset(t.script, G.scriptTeam);
  scriptLoad(t.script, type & 255);
  return 0;
};
var teamUnknown0788 = () => {
  const t = curT();
  if (t.target === 0) return 0;
  const tl = indexGetTile(t.target);
  const find = findAll(t.houseID);
  for (; ; ) {
    const u = unitFind(find, unitGetHouseID);
    if (!u) break;
    if (u.team - 1 !== t.index) continue;
    if (t.target === 0) {
      unitSetAction(u, ACTION.GUARD);
      continue;
    }
    const distance2 = u16(unitInfo[u.o.type].fireDistance << 8);
    if (u.actionID === ACTION.ATTACK && u.targetAttack === t.target) {
      if (u.targetMove !== 0) continue;
      if (tileGetDistance(u.o.position, tl) >= distance2) continue;
    }
    if (u.actionID !== ACTION.ATTACK) unitSetAction(u, ACTION.ATTACK);
    let orientation = (tileGetDirection(tl, u.o.position) & 192) + randomRange(0, 127);
    if (orientation < 0) orientation += 256;
    const packed = packTile(tileMoveByDirection(tl, orientation, distance2));
    if (objectGetByPackedTile(packed) === null) unitSetDestination(u, indexEncode(packed, 1 /* TILE */));
    else unitSetDestination(u, indexEncode(packTile(tl), 1 /* TILE */));
    unitSetTarget(u, t.target);
  }
  return 0;
};
var teamDisplayText = (script) => {
  const t = curT();
  if (t.houseID === G.playerHouseID) return 0;
  const text = scriptText(script, P(script, 1));
  if (text) G.onMessage(text, 0);
  return 0;
};
var scriptFunctionsStructure = [
  generalDelay,
  generalNoOperation,
  structureUnknown0A81,
  structureFindUnitByType,
  structureSetStateFn,
  generalDisplayText,
  structureUnknown11B9,
  structureUnknown0C5A,
  structureFindTargetUnit,
  structureRotateTurret,
  structureGetDirection,
  structureFire,
  generalNoOperation,
  structureGetState,
  structureVoicePlay,
  structureRemoveFogAroundTile,
  generalNoOperation,
  generalNoOperation,
  generalNoOperation,
  generalNoOperation,
  generalNoOperation,
  structureRefineSpice,
  structureExplode,
  structureDestroyFn,
  generalNoOperation
];
var scriptFunctionsUnit = [
  unitGetInfo,
  unitSetActionFn,
  generalDisplayText,
  generalGetDistanceToTile,
  unitStartAnimation,
  unitSetDestinationFn,
  unitGetOrientation,
  unitSetOrientationFn,
  unitFire,
  unitMCVDeploy,
  unitSetActionDefault,
  unitBlink,
  unitCalculateRoute,
  generalIsEnemy,
  unitExplosionSingle,
  unitDie,
  generalDelay,
  generalIsFriendly,
  unitExplosionMultiple,
  unitSetSprite,
  unitTransportDeliver,
  generalNoOperation,
  unitMoveToTarget,
  generalRandomRange,
  generalFindIdle,
  unitSetDestinationDirect,
  unitStop,
  unitSetSpeedFn,
  unitFindBestTarget,
  unitGetTargetPriority,
  unitMoveToStructure,
  unitIsInTransport,
  unitGetAmount,
  unitRandomSoldier,
  unitPickup,
  unitCallUnitByTypeFn,
  unitUnknown2552,
  unitFindStructure,
  generalVoicePlay,
  unitDisplayDestroyedText,
  unitRemoveFogFn,
  generalSearchSpice,
  unitHarvest,
  generalNoOperation,
  generalGetLinkedUnitType,
  generalGetIndexType,
  generalDecodeIndex,
  unitIsValidDestination,
  unitGetRandomTile,
  unitIdleAction,
  generalUnitCount,
  unitGoToClosestStructure,
  generalNoOperation,
  generalNoOperation,
  unitSandwormGetBestTarget,
  unitUnknown2BD5,
  generalGetOrientation,
  generalNoOperation,
  unitSetTargetFn,
  generalUnknown0288,
  generalDelayRandom,
  unitRotate2,
  generalGetDistanceToObject,
  generalNoOperation
];
var scriptFunctionsTeam = [
  generalDelay,
  teamDisplayText,
  teamGetMembers,
  teamAddClosestUnit,
  teamGetAverageDistance,
  teamUnknown0543,
  teamFindBestTarget,
  teamUnknown0788,
  teamLoad,
  teamLoad2,
  generalDelayRandom,
  generalDisplayModalMessage,
  teamGetVariable6,
  teamGetTarget,
  generalNoOperation
];

// web/src/engine/game.ts
var SCRIPT_UNIT = 319880;
var SCRIPT_BUILD = 318256;
var SCRIPT_TEAM = 319530;
var TEAM_ACTION_CHAR = { N: 0, S: 1, F: 2, K: 3, G: 4 };
var MOVEMENT_CHAR = { F: MOVEMENT.FOOT, T: MOVEMENT.TRACKED, H: MOVEMENT.HARVESTER, W: MOVEMENT.WHEELED, w: MOVEMENT.WINGER, S: MOVEMENT.SLITHER };
var tablesReady = false;
function upgradeUnlocksUnit(s) {
  const level = s.upgradeLevel;
  const built = G.houses[s.creatorHouseID]?.structuresBuilt ?? 0;
  switch (s.o.type) {
    case STRUCTURE.LIGHT_VEHICLE:
      return level === 1 ? UNIT.HARVESTER : UNIT.QUAD;
    case STRUCTURE.HEAVY_VEHICLE:
      if (!(built & 1 << STRUCTURE.OUTPOST)) return UNIT.HARVESTER;
      if (level === 1) return s.creatorHouseID === HOUSE.ORDOS ? UNIT.SIEGE_TANK : UNIT.LAUNCHER;
      return level === 2 ? UNIT.SIEGE_TANK : UNIT.MCV;
    case STRUCTURE.HIGH_TECH:
      return s.o.houseID === HOUSE.HARKONNEN ? UNIT.CARRYALL : UNIT.ORNITHOPTER;
    case STRUCTURE.WOR_TROOPER:
      return UNIT.TROOPERS;
    case STRUCTURE.BARRACKS:
      return s.o.houseID === HOUSE.ORDOS && level === 1 ? UNIT.TROOPER : UNIT.INFANTRY;
    default:
      return UNIT.CARRYALL;
  }
}
var Game = class {
  constructor(rom) {
    this.rom = rom;
    if (!tablesReady) {
      applyRomTables(rom.bytes);
      tablesReady = true;
    }
    G.iconGroups = Array.from({ length: 27 }, (_, i) => rom.iconGroup(i));
    G.veiledTileID = G.iconGroups[7][15];
    G.bloomTileID = G.iconGroups[10][0];
    G.builtSlabTileID = G.iconGroups[8][2];
    G.landscapeTileID = G.iconGroups[9][0];
    G.wallTileID = G.iconGroups[6][0];
    G.scriptUnit = loadEmc(rom.bytes, SCRIPT_UNIT, scriptFunctionsUnit);
    G.scriptStructure = loadEmc(rom.bytes, SCRIPT_BUILD, scriptFunctionsStructure);
    G.scriptTeam = loadEmc(rom.bytes, SCRIPT_TEAM, scriptFunctionsTeam);
    setUnitCreateWrapper(unitCreateWrapper);
  }
  rom;
  /** номер миссии 1..9 и дом сценария */
  mission = 1;
  /** 0 — easy, 1 — normal, 2 — hard. */
  difficulty = 1;
  houseCode = "A";
  ended = null;
  /** кадров, которые игра ещё идёт после конца миссии (пролёт орнитоптеров, $026984) */
  afterEnd = 0;
  onEnd = () => {
  };
  /** выбранное здание (клетка g_selectionPosition) */
  selectedStructure = null;
  levelEndTimer = 0;
  /** космопорт MD: юниты сценария (CHOAM) по возрастанию номера — в окне и при нулевом запасе */
  starportListed = [];
  /** цены космопорта MD и кадр, до которого они действуют ($FFBF88, 18000 кадров) */
  starportPriceList = [];
  starportPriceUntil = -1;
  get player() {
    return G.houses[G.playerHouseID];
  }
  /** Game_LoadScenario + Scenario_Load + Game_Prepare */
  load(house, mission) {
    G.infiniteSpice = false;
    G.droneGrenades.length = 0;
    G.difficulty = Math.max(0, Math.min(2, Math.round(this.difficulty)));
    const sc = this.rom.scenario(house, mission);
    this.houseCode = house;
    this.mission = mission;
    this.ended = null;
    this.selectedStructure = null;
    this.levelEndTimer = 0;
    poolsReset();
    animationInit();
    explosionInit();
    unitResetTimers();
    structureResetTimers();
    houseResetTimers();
    teamResetTimers();
    G.starportAvailable.fill(0);
    G.playerCreditsNoSilo = 0;
    G.houseMissileCountdown = 0;
    G.unitHouseMissile = null;
    G.unitActive = null;
    G.structureActive = null;
    G.activeAction = 65535;
    G.structureActiveType = 65535;
    G.unitSelected = null;
    G.selectionType = SELECTION.STRUCTURE;
    randomSeed(G.timerGame * 2654435761);
    randomLCGSeed(G.timerGame);
    G.validateStrictIfZero++;
    G.scenarioID = mission;
    G.campaignID = mission - 1;
    G.scenario = newScenario();
    G.scenario.winFlags = sc.winFlags;
    G.scenario.loseFlags = sc.loseFlags;
    G.scenario.timeOut = sc.timeOut;
    G.scenario.mapScale = sc.mapScale;
    G.mapScale = sc.mapScale;
    const m = this.rom.missionMap(sc.mapIndex);
    for (let i = 0; i < 4096; i++) {
      const t = G.map[i];
      G.mapTileID[i] = m.ground[i];
      t.groundTileID = m.ground[i];
      t.isUnveiled = false;
      t.overlayTileID = G.veiledTileID;
    }
    let player = null;
    for (const hs of sc.houses) {
      const h = houseAllocate(hs.id);
      if (!h) continue;
      h.credits = hs.credits;
      if (hs.brain !== "human" && h.credits !== 65535) {
        h.credits = Math.floor(h.credits * [0.8, 1, 1.5][G.difficulty]);
      }
      h.creditsQuota = hs.quota;
      h.unitCountMax = hs.maxUnits;
      if (hs.brain === "human") {
        h.flags.human = true;
        G.playerHouseID = hs.id;
        G.playerCreditsNoSilo = h.credits;
        player = h;
      } else {
        h.flags.human = false;
      }
    }
    if (player && player.unitCountMax === 0) {
      let max = 80;
      const find = findAll();
      for (; ; ) {
        const h2 = houseFind(find);
        if (!h2) break;
        if (h2.flags.human) continue;
        max -= h2.unitCountMax;
      }
      player.unitCountMax = max;
    }
    for (const su of sc.units) {
      if (!G.houses[su.house]?.flags.used) houseAllocate(su.house);
      const u = unitAllocate(INDEX_INVALID, su.type, su.house);
      if (!u) continue;
      u.o.flags.byScenario = true;
      u.o.hitpoints = idiv(su.hp * unitInfo[su.type].o.hitpoints, 256);
      u.o.position = unpackTile(packXY(su.x, su.y));
      u.orientation[0].current = s8(su.orientation);
      u.actionID = su.action;
      u.nextActionID = ACTION.INVALID;
      if (!mapIsValidPosition(packTile(u.o.position)) && G.campaignID > 2) {
        unitFree(u);
        continue;
      }
      if (!u.o.flags.isNotOnMap) unitSetAction(u, u.actionID);
      u.o.seenByHouses = 0;
      unitHouseUnitCountAdd(u, u.o.houseID);
      unitSetOrientation(u, u.orientation[0].current, true, 0);
      unitSetOrientation(u, u.orientation[0].current, true, 1);
      unitSetSpeed(u, 0);
    }
    for (const ss of sc.structures) {
      if (!G.houses[ss.house]?.flags.used) houseAllocate(ss.house);
      const position = packXY(ss.x, ss.y);
      const gen = ss.type === STRUCTURE.WALL || ss.type === STRUCTURE.SLAB_1x1 || ss.type === STRUCTURE.SLAB_2x2;
      if (gen) {
        structureCreate(INDEX_INVALID, ss.type, ss.house, position);
        continue;
      }
      if (structureGetByPackedTile(position)) continue;
      const s = structureCreate(INDEX_INVALID, ss.type, ss.house, position);
      if (!s) continue;
      s.o.hitpoints = structureInfo[s.o.type].o.hitpoints;
      s.o.flags.degrades = false;
      s.state = STATE.IDLE;
    }
    sc.reinforcements.forEach((r, index) => {
      const [houseID, unitType, locationID, time] = r.values;
      if (index >= 16) return;
      G.validateStrictIfZero++;
      const u = unitCreate(INDEX_INVALID, unitType, houseID, { x: 65535, y: 65535 }, 0);
      G.validateStrictIfZero--;
      if (!u) return;
      const timeBetween = (time >> 8) * 6 + 1;
      G.scenario.reinforcement[index] = { unitID: u.o.index, locationID, timeLeft: timeBetween, timeBetween, repeat: 0 };
    });
    for (const t of sc.teams) {
      teamCreate(t.house, TEAM_ACTION_CHAR[t.aiMode] ?? 0, MOVEMENT_CHAR[t.movement] ?? MOVEMENT.FOOT, t.min, t.max);
    }
    for (const [type, count] of sc.choam) if (type < UNIT.MAX) G.starportAvailable[type] = count;
    this.starportListed = [...sc.choam.keys()].filter((t) => t < UNIT.MAX).sort((a, b) => a - b);
    this.starportPriceUntil = -1;
    for (const b of sc.bloom) {
      const p = packXY(b.x, b.y);
      G.map[p].groundTileID = G.bloomTileID;
      G.mapTileID[p] |= 32768;
    }
    for (const f of sc.field) mapBloomExplodeSpice(packXY(f.x, f.y), HOUSE_INVALID);
    G.tickScenarioStart = G.timerGame;
    this.prepare();
    G.validateStrictIfZero--;
    return sc;
  }
  /** Game_Prepare */
  prepare() {
    G.validateStrictIfZero++;
    for (let i = 0; i < 4096; i++) {
      const t = G.map[i];
      const u = unitGetByPackedTile(i);
      const s = structureGetByPackedTile(i);
      if (!u || !u.o.flags.used) t.hasUnit = false;
      if (!s || !s.o.flags.used) t.hasStructure = false;
      if (t.isUnveiled) mapUnveilTile(i, G.playerHouseID);
    }
    let find = findAll();
    for (; ; ) {
      const u = unitFind(find, unitGetHouseID);
      if (!u) break;
      if (u.o.flags.isNotOnMap) continue;
      unitRemoveFog(u);
      unitUpdateMap(1, u);
    }
    find = findAll();
    for (; ; ) {
      const s = structureFind(find);
      if (!s) break;
      if (s.o.type === STRUCTURE.SLAB_1x1 || s.o.type === STRUCTURE.SLAB_2x2 || s.o.type === STRUCTURE.WALL) continue;
      if (s.o.flags.isNotOnMap) continue;
      structureRemoveFog(s);
      if (s.o.type === STRUCTURE.STARPORT && s.o.linkedID !== 255) {
        const u = G.units[s.o.linkedID];
        if (!u.o.flags.used || !u.o.flags.isNotOnMap) {
          s.o.linkedID = 255;
          s.countDown = 0;
        } else {
          structureSetState(s, STATE.READY);
        }
      }
      scriptLoad(s.o.script, s.o.type);
      const h = G.houses[s.o.houseID];
      if (s.o.type === STRUCTURE.PALACE) h.palacePosition = { ...s.o.position };
      if (h.palacePosition.x !== 0 || h.palacePosition.y !== 0) continue;
      h.palacePosition = { ...s.o.position };
    }
    find = findAll();
    for (; ; ) {
      const h = houseFind(find);
      if (!h) break;
      h.structuresBuilt = structureGetStructuresBuilt(h);
      houseUpdateCreditsStorage(h.index);
      houseCalculatePowerAndCredit(h);
    }
    G.tickHousePowerMaintenance = Math.max(G.timerGame + 70, G.tickHousePowerMaintenance);
    G.playerCredits = 65535;
    G.validateStrictIfZero--;
  }
  /** Один такт 1/60 с: таймеры, команды, юниты, здания, дома, взрывы, анимации, конец миссии. */
  tick() {
    G.timerGUI++;
    G.timerGame++;
    if (this.ended) {
      if (this.afterEnd <= 0) return;
      this.afterEnd--;
    }
    gameLoopTeam();
    gameLoopUnit();
    gameLoopStructure();
    gameLoopHouse();
    explosionTick();
    animationTick();
    unitSort();
    G.playerCredits = this.player?.credits ?? 0;
    if (!this.ended) this.levelEnd();
  }
  // ------------------------------------------------------------------ конец миссии (opendune.c)
  countStructures() {
    let friendly = 0;
    let enemy = 0;
    const find = findAll();
    for (; ; ) {
      const s = structureFind(find);
      if (!s) break;
      const t = s.o.type;
      if (t === STRUCTURE.SLAB_1x1 || t === STRUCTURE.SLAB_2x2 || t === STRUCTURE.WALL || t === STRUCTURE.TURRET || t === STRUCTURE.ROCKET_TURRET) continue;
      if (s.o.houseID === G.playerHouseID) friendly++;
      else enemy++;
    }
    return { friendly, enemy };
  }
  isLevelFinished() {
    if (G.timerGame - G.tickScenarioStart < 7200) return false;
    const sc = G.scenario;
    let finish = false;
    if ((sc.winFlags & 3) !== 0) {
      const c = this.countStructures();
      if ((sc.winFlags & 1) !== 0 && c.enemy === 0) finish = true;
      if ((sc.winFlags & 2) !== 0 && c.friendly === 0) finish = true;
    }
    if ((sc.winFlags & 4) !== 0 && G.playerCredits !== 65535 && G.playerCredits >= this.player.creditsQuota) finish = true;
    if ((sc.winFlags & 8) !== 0 && G.timerGame >= this.timeoutTick()) finish = true;
    return finish;
  }
  isLevelWon() {
    const sc = G.scenario;
    let win = false;
    if ((sc.loseFlags & 3) !== 0) {
      const c = this.countStructures();
      win = true;
      if ((sc.loseFlags & 1) !== 0) win = win && c.enemy === 0;
      if ((sc.loseFlags & 2) !== 0) win = win && c.friendly !== 0;
    }
    if (!win && (sc.loseFlags & 4) !== 0 && G.playerCredits !== 65535) win = G.playerCredits >= this.player.creditsQuota;
    if (!win && (sc.loseFlags & 8) !== 0) win = G.timerGame < this.timeoutTick();
    return win;
  }
  timeoutTick() {
    return G.tickScenarioStart + G.scenario.timeOut * 60 * 60;
  }
  levelEnd() {
    if (this.levelEndTimer >= G.timerGame) return;
    if (this.isLevelFinished()) {
      this.ended = this.isLevelWon() ? "won" : "lost";
      G.onFeedback(this.ended === "won" ? 40 : 41);
      G.onMessage(this.ended === "won" ? msg.missionWon : msg.missionLost, 0);
      this.onEnd(this.ended);
    }
    this.levelEndTimer = G.timerGame + 300;
  }
  // ------------------------------------------------------------------ что видно игроку
  isVisible(packed) {
    return G.map[packed & 4095].isUnveiled;
  }
  /** Юниты на карте, которые должен видеть игрок (GUI_Widget_Viewport_Draw). */
  visibleUnits() {
    return G.unitFind.filter((u) => !u.o.flags.isNotOnMap && G.map[packTile(u.o.position)].isUnveiled);
  }
  // ------------------------------------------------------------------ команды игрока
  /** Map_SetSelection: выбрать юнит или здание на клетке. */
  selectAt(packed) {
    if (G.selectionType === SELECTION.TARGET || G.selectionType === SELECTION.PLACE) return null;
    if (G.map[packed].overlayTileID === G.veiledTileID) return null;
    const s = structureGetByPackedTile(packed);
    if (s) {
      unitSelect(null);
      this.selectedStructure = s;
      return s;
    }
    this.selectedStructure = null;
    const u = unitGetByPackedTile(packed);
    if (u && u.o.type !== UNIT.CARRYALL) {
      unitSelect(u);
      return G.unitSelected;
    }
    unitSelect(null);
    return null;
  }
  /** Приказ юниту с целью на клетке (щелчок в режиме цели, gui/viewport.c). */
  order(u, action, packed) {
    if (unitGetHouseID(u) !== G.playerHouseID) return;
    if (u.o.type === UNIT.COMBAT_DRONE) {
      if (!u.drone) initializeDrone(u);
      if (action === ACTION.MOVE || action === ACTION.PATROL) packed = packTile(clampDronePoint(u, tileCenter(unpackTile(packed))));
      if (u.drone && action !== ACTION.RETURN && u.drone.phase !== "dock") u.drone.phase = "guard";
    }
    if (action === ACTION.PATROL) {
      const actions = unitInfo[u.o.type].o.actionsPlayer;
      if (!actions.includes(ACTION.MOVE) || !actions.includes(ACTION.ATTACK) || !mapIsValidPosition(packed)) return;
      u.patrolActive = true;
      u.patrolEngaging = false;
      u.patrolToEnd = true;
      u.patrolStart = { ...u.o.position };
      u.patrolEnd = tileCenter(unpackTile(packed));
      u.targetAttack = 0;
      u.targetMove = 0;
      u.route[0] = 255;
      unitSetAction(u, ACTION.MOVE);
      unitSetDestination(u, indexEncode(packed, 1 /* TILE */));
      return;
    }
    u.patrolActive = false;
    u.patrolEngaging = false;
    u.harvesterDefense = void 0;
    objectScriptVariable4Clear(u.o);
    u.targetAttack = 0;
    u.targetMove = 0;
    u.route[0] = 255;
    const encoded = action !== ACTION.MOVE && action !== ACTION.HARVEST ? indexEncode(unitFindTargetAround(packed), 1 /* TILE */) : indexEncode(packed, 1 /* TILE */);
    unitSetAction(u, action);
    if (action === ACTION.MOVE) unitSetDestination(u, encoded);
    else if (action === ACTION.HARVEST) u.targetMove = encoded;
    else {
      unitSetTarget(u, encoded);
      const target = indexGetUnit(u.targetAttack);
      if (target) target.blinkCounter = 8;
    }
    if (u.o.type === UNIT.COMBAT_DRONE && action === ACTION.ATTACK && !droneTargetAllowed(u, u.targetAttack)) {
      u.targetAttack = 0;
      u.targetMove = 0;
      u.actionID = ACTION.GUARD;
      G.onMessage("\u0426\u0435\u043B\u044C \u0432\u043D\u0435 \u0437\u043E\u043D\u044B \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0434\u0440\u043E\u043D\u0430\u043C\u0438 \u2014 9 \u043A\u043B\u0435\u0442\u043E\u043A.", 1);
    }
    if (unitInfo[u.o.type].movementType === MOVEMENT.FOOT) G.onSound(16);
    else G.onSound(18);
  }
  /** Какой приказ отдать по умолчанию, если игрок указал клетку (A в оригинале, левая кнопка мыши). */
  defaultAction(u, packed) {
    const actions = unitInfo[u.o.type].o.actionsPlayer;
    const has = (a) => actions.includes(a);
    const target = objectGetByPackedTile(unitFindTargetAround(packed));
    if (target && G.map[packed].isUnveiled) {
      const enemyHouse = target.flags.isUnit ? unitGetHouseID(G.units[target.index]) : target.houseID;
      if (enemyHouse !== G.playerHouseID && has(ACTION.ATTACK)) return ACTION.ATTACK;
    }
    if (u.o.type === UNIT.HARVESTER && has(ACTION.HARVEST)) {
      const lst = mapGetLandscapeType(packed);
      if (lst === 8 || lst === 9) return ACTION.HARVEST;
    }
    if (has(ACTION.MOVE)) return ACTION.MOVE;
    return actions[0];
  }
  /** Кнопка действия юнита (GUI_Widget_TextButton_Click): true — нужно указать цель на карте. */
  activateSelf(u) {
    if (unitGetHouseID(u) !== G.playerHouseID || u.o.type !== UNIT.DEVASTATOR) return false;
    if (!unitInfo[u.o.type].o.actionsPlayer.includes(ACTION.DESTRUCT)) return false;
    this.unitCommand(u, ACTION.DESTRUCT);
    return true;
  }
  unitCommand(u, action) {
    if (action === ACTION.PATROL) {
      const actions = unitInfo[u.o.type].o.actionsPlayer;
      if (!actions.includes(ACTION.MOVE) || !actions.includes(ACTION.ATTACK)) return false;
      G.unitActive = u;
      G.activeAction = action;
      G.selectionType = SELECTION.TARGET;
      return true;
    }
    u.patrolActive = false;
    u.patrolEngaging = false;
    u.harvesterDefense = void 0;
    if (u.deviated !== 0) {
      unitDeviationDecrease(u, 5);
      if (u.deviated === 0) return false;
    }
    const ai = actionInfo[action];
    if (ai.selectionType === SELECTION.TARGET) {
      G.unitActive = u;
      G.activeAction = action;
      G.selectionType = SELECTION.TARGET;
      return true;
    }
    objectScriptVariable4Clear(u.o);
    u.targetAttack = 0;
    u.targetMove = 0;
    u.route[0] = 255;
    unitSetAction(u, action);
    if (unitInfo[u.o.type].movementType === MOVEMENT.FOOT) G.onSound(16);
    else G.onSound(18);
    return false;
  }
  /** Указана цель для выбранного действия. */
  targetClick(packed) {
    if (G.unitHouseMissile) {
      unitLaunchHouseMissile(packed);
      return;
    }
    const u = G.unitActive;
    const action = G.activeAction;
    G.unitActive = null;
    G.activeAction = 65535;
    G.selectionType = SELECTION.UNIT;
    if (u) this.order(u, action, packed);
  }
  cancelTarget() {
    if (G.structureActiveType !== 65535) this.cancelPlace();
    if (!G.unitActive) return;
    G.unitActive = null;
    G.activeAction = 65535;
    G.selectionType = SELECTION.UNIT;
  }
  // ---- здания
  /** Что можно заказать на заводе: тип и доступность (1 — да, −1 — после улучшения). */
  buildOptions(s) {
    const si = structureInfo[s.o.type];
    if (!si.o.flags.factory) return [];
    structureGetBuildable(s);
    const out = [];
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) {
      for (let i = 0; i < STRUCTURE.MAX; i++) {
        const o = structureInfo[i].o;
        if (o.available) out.push({ type: i, available: o.available, cost: o.buildCredits, time: o.buildTime });
      }
      out.sort((a, b) => structureInfo[b.type].o.sortPriority - structureInfo[a.type].o.sortPriority);
    } else {
      for (let i = 0; i < UNIT.MAX; i++) {
        const o = unitInfo[i].o;
        if (o.available) out.push({ type: i, available: o.available, cost: o.buildCredits, time: o.buildTime });
      }
      out.sort((a, b) => unitInfo[b.type].o.sortPriority - unitInfo[a.type].o.sortPriority);
    }
    return out;
  }
  /**
   * Цены космопорта MD ($008F14, формула $027334): цена постройки × (60 + random(0..50) + random(0..50)) / 100.
   * Пересчитываются, когда истёк таймер $FFBF88 (18000 кадров), иначе окно показывает прежние.
   */
  starportPrices() {
    if (this.starportPriceUntil < 0 || G.timerGame >= this.starportPriceUntil) {
      this.starportPriceList = unitInfo.map((ui) => {
        const f = randomRange(0, 50) + randomRange(0, 50) + 60;
        return Math.floor(ui.o.buildCredits * f / 100);
      });
      this.starportPriceUntil = G.timerGame + 18e3;
    }
    return this.starportPriceList;
  }
  /** Купить юнит в космопорте: деньги списываются сразу, доставка — фрегатом. */
  starportBuy(s, type, price) {
    const h = G.houses[s.o.houseID];
    if (G.starportAvailable[type] <= 0 || h.credits < price) return false;
    h.credits -= price;
    structureStarportBuy(s, [type]);
    return true;
  }
  /** Начать производство (или купить в космопорте). */
  build(s, type) {
    if (structureCanQueueUnits(s)) return structureEnqueueUnit(s, type);
    if (s.o.type === STRUCTURE.STARPORT) return false;
    if (s.o.flags.onHold && s.objectType === type && s.o.linkedID !== 255) {
      s.o.flags.onHold = false;
      return true;
    }
    return structureBuildObject(s, type);
  }
  canQueueUnits(s) {
    return structureCanQueueUnits(s);
  }
  unitQueue(s) {
    return s.unitQueue ?? [];
  }
  cancelQueuedUnit(s, index) {
    return structureCancelQueuedUnit(s, index);
  }
  /** Состояние производства для меню. */
  production(s) {
    if (s.o.linkedID === 255 || s.objectType === 65535) return null;
    const oi = s.o.type === STRUCTURE.CONSTRUCTION_YARD ? structureInfo[s.objectType]?.o : unitInfo[s.objectType]?.o;
    if (!oi) return null;
    const total = oi.buildTime << 8;
    return { type: s.objectType, progress: total ? 1 - s.countDown / total : 1, ready: s.countDown === 0 && s.state === STATE.READY, onHold: s.o.flags.onHold };
  }
  /** STR_PLACE_IT: готовое здание со Строительного двора — в режим постановки. */
  placeIt(cy, _announce = true) {
    if (cy.o.type !== STRUCTURE.CONSTRUCTION_YARD || cy.o.linkedID === 255 || cy.countDown !== 0) return false;
    G.structureActive = G.structures[cy.o.linkedID];
    G.structureActiveType = cy.objectType;
    G.structureActivePosition = packTile(cy.o.position);
    cy.o.linkedID = 255;
    G.selectionType = SELECTION.PLACE;
    return true;
  }
  canPlaceAt(packed) {
    if (G.structureActiveType === 65535) return 0;
    return structureIsValidBuildLocation(packed, G.structureActiveType);
  }
  placementDetail(packed) {
    if (G.structureActiveType === 65535) return { valid: 0, cells: [] };
    return structurePlacementDetail(packed, G.structureActiveType);
  }
  place(packed) {
    return structurePlayerPlace(packed);
  }
  /** GUI_Widget_Cancel_Click для постановки здания. */
  cancelPlace() {
    if (G.structureActiveType === 65535) return;
    const s = structureGetByPackedTile(G.structureActivePosition);
    const s2 = G.structureActive;
    if (s && s2) s.o.linkedID = s2.o.index & 255;
    else if (s2) structureFree2(s2);
    G.structureActive = null;
    G.structureActiveType = 65535;
    G.selectionType = SELECTION.STRUCTURE;
  }
  toggleRepair(s) {
    structureSetRepairingState(s, -1);
  }
  upgrade(s) {
    structureSetUpgradingState(s, -1);
  }
  holdOrResume(s) {
    if (s.o.flags.onHold) s.o.flags.onHold = false;
    else s.o.flags.onHold = true;
  }
  /** Отменить производство: деньги за непостроенную часть возвращаются (Structure_CancelBuild). */
  cancelBuild(s) {
    structureCancelBuild(s);
    structureSetState(s, STATE.IDLE);
  }
  /**
   * СТОП окна здания MD ($02915E → $0103AA): отменить всё — заказ (потраченное возвращается), улучшение
   * (тоже с возвратом, следующее начнётся с нуля) и ремонт.
   */
  stopAll(s) {
    const h = G.houses[s.o.houseID];
    while (s.unitQueue?.length) structureCancelQueuedUnit(s, s.unitQueue.length - 1);
    if (s.o.linkedID !== 255) {
      const before = h.credits;
      const prepaid = s.prepaidUnitCost;
      structureCancelBuild(s);
      h.credits = before + (prepaid ?? s.spent);
      structureSetState(s, STATE.IDLE);
    } else if (s.o.flags.upgrading) {
      h.credits += s.spent;
      s.o.flags.upgrading = false;
      s.upgradeTimeLeft = 100;
    }
    s.spent = 0;
    s.o.flags.repairing = false;
    s.o.flags.onHold = false;
  }
  /** РЕМОНТ окна здания MD ($02912C): только включает ремонт, и только у повреждённого здания. */
  startRepair(s) {
    if (s.o.hitpoints < structureInfo[s.o.type].o.hitpoints && !s.o.flags.repairing) structureSetRepairingState(s, 1);
  }
  palaceSpecial(s) {
    if (s.o.type !== STRUCTURE.PALACE || s.countDown !== 0) return;
    structureActivateSpecial(s);
  }
  /** Можно ли улучшить здание (и сколько стоит). */
  upgradeInfo(s) {
    const si = structureInfo[s.o.type];
    return { possible: s.upgradeTimeLeft !== 0 && !!si.o.flags.factory, cost: idiv(si.o.buildCredits, 2) };
  }
  /**
   * Пункт «*УЛУЧШИТЬ*» в окне здания MD ($00FAF4…$00FC26): у заводов (не космопорта), если здание можно
   * улучшить и у дома построен радар; цена — половина стоимости здания. `unlocks` — что улучшение откроет
   * (его картинку показывает окно): у двора ракетная башня, у заводов юнитов — по таблице $010DA2.
   */
  upgradeEntry(s) {
    const si = structureInfo[s.o.type];
    if (!si.o.flags.factory || s.o.type === STRUCTURE.STARPORT) return null;
    if (!structureIsUpgradable(s)) return null;
    const h = G.houses[s.o.houseID];
    if (!(h.structuresBuilt & 1 << STRUCTURE.OUTPOST)) return null;
    const cost = Math.trunc(si.o.buildCredits / 2);
    if (s.o.type === STRUCTURE.CONSTRUCTION_YARD) return { unlocks: STRUCTURE.ROCKET_TURRET, cost };
    const unlocks = upgradeUnlocksUnit(s);
    if (this.buildOptions(s).some((o) => o.type === unlocks)) return null;
    return { unlocks, cost };
  }
  buildable(s) {
    return structureGetBuildable(s);
  }
  /** Коды оригинала, вводимые как пароль (код проверки $021908). */
  cheat(code) {
    if (code === "LOOKAROUND") {
      G.revealAll = !G.revealAll;
    } else if (code === "SPLURGEOLA") {
      if (!this.player) return;
      this.player.credits = 25e3;
      G.playerCreditsNoSilo = Math.max(G.playerCreditsNoSilo, this.player.credits);
    } else G.playtester = !G.playtester;
  }
};

// web/src/rom/lcw.ts
var LcwError = class extends Error {
};
function lcwDecompress(src, start = 0, maxOut = 65536) {
  const out = new Uint8Array(maxOut);
  let o = 0;
  let i = start;
  for (; ; ) {
    if (i >= src.length) throw new LcwError("\u043F\u043E\u0442\u043E\u043A \u0432\u044B\u0448\u0435\u043B \u0437\u0430 \u043A\u043E\u043D\u0435\u0446 ROM");
    const cmd = src[i++];
    if ((cmd & 128) === 0) {
      const count = (cmd >> 4) + 3;
      const rel = (cmd & 15) << 8 | src[i++];
      let from = o - rel;
      if (from < 0 || rel === 0) throw new LcwError("\u043F\u043B\u043E\u0445\u043E\u0435 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0435 \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u0435");
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      for (let k = 0; k < count; k++) out[o++] = out[from++];
    } else if ((cmd & 64) === 0) {
      if (cmd === 128) return { data: out.slice(0, o), consumed: i - start };
      const count = cmd & 63;
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      out.set(src.subarray(i, i + count), o);
      o += count;
      i += count;
    } else if (cmd === 254) {
      const count = src[i] | src[i + 1] << 8;
      const value = src[i + 2];
      i += 3;
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      out.fill(value, o, o + count);
      o += count;
    } else {
      let count;
      let from;
      if (cmd === 255) {
        count = src[i] | src[i + 1] << 8;
        from = src[i + 2] | src[i + 3] << 8;
        i += 4;
      } else {
        count = (cmd & 63) + 3;
        from = src[i] | src[i + 1] << 8;
        i += 2;
      }
      if (count && from >= o) throw new LcwError("\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u043E\u0435 \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0437\u0430 \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u043C\u0438");
      if (o + count > maxOut) throw new LcwError("\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0432\u044B\u0445\u043E\u0434");
      for (let k = 0; k < count; k++) out[o++] = out[from++];
    }
  }
}

// web/src/rom/md.ts
var CRAM_LEVELS = [0, 52, 87, 116, 144, 172, 206, 255];
function cramToRGBA(word, alpha = 255) {
  const r = CRAM_LEVELS[word >> 1 & 7];
  const g = CRAM_LEVELS[word >> 5 & 7];
  const b = CRAM_LEVELS[word >> 9 & 7];
  return (alpha << 24 | b << 16 | g << 8 | r) >>> 0;
}
function readU16(b, at) {
  return b[at] << 8 | b[at + 1];
}
function readU32(b, at) {
  return (b[at] << 24 | b[at + 1] << 16 | b[at + 2] << 8 | b[at + 3]) >>> 0;
}

// web/src/rom/scenario.ts
var FILE_TABLE = 339028;
var FILE_COUNT = 33;
var HOUSE_SECTION = { 2: 0, 3: 1, 4: 2, 5: 4 };
function readFiles(rom) {
  const files = /* @__PURE__ */ new Map();
  for (let i = 0; i < FILE_COUNT; i++) {
    const namePtr = readU32(rom, FILE_TABLE + i * 8);
    const dataPtr = readU32(rom, FILE_TABLE + i * 8 + 4);
    let name = "";
    for (let p = namePtr; rom[p]; p++) name += String.fromCharCode(rom[p]);
    files.set(name, dataPtr);
  }
  return files;
}
function parseScenario(rom, name, start) {
  const sc = {
    name,
    losePicture: "",
    winPicture: "",
    briefPicture: "",
    timeOut: 0,
    mapScale: 0,
    mapIndex: 1,
    cursor: { x: 0, y: 0 },
    tactical: { x: 0, y: 0 },
    loseFlags: 0,
    winFlags: 0,
    bloom: [],
    field: [],
    houses: [],
    choam: /* @__PURE__ */ new Map(),
    teams: [],
    units: [],
    structures: [],
    reinforcements: []
  };
  let p = start;
  const word = () => {
    const v = readU16(rom, p);
    p += 2;
    return v;
  };
  let shift = 0;
  const xy = (packed) => ({ x: (packed & 63) + shift, y: (packed >> 6) + shift });
  const houses = /* @__PURE__ */ new Map();
  const house = (section) => {
    const id = HOUSE_SECTION[section];
    if (!houses.has(id)) houses.set(id, { id, credits: 0, quota: 0, brain: "cpu", maxUnits: 39 });
    return houses.get(id);
  };
  for (let guard = 0; guard < 1e4; guard++) {
    const head = word();
    if (head === 65535) break;
    const section = head >> 8;
    const key = head & 255;
    if (section === 0 && key <= 2) {
      const len = word();
      let s = "";
      for (let k = 0; k < len && rom[p + k]; k++) s += String.fromCharCode(rom[p + k]);
      p += len + (len & 1);
      if (key === 0) sc.losePicture = s;
      else if (key === 1) sc.winPicture = s;
      else sc.briefPicture = s;
      continue;
    }
    switch (section) {
      case 0: {
        const v = word();
        if (key === 3) sc.timeOut = v;
        else if (key === 4) {
          sc.mapScale = v;
          shift = v === 1 ? 16 : 0;
        } else if (key === 5) sc.cursor = xy(v);
        else if (key === 6) sc.tactical = xy(v);
        else if (key === 7) sc.loseFlags = v;
        else if (key === 8) sc.winFlags = v;
        break;
      }
      case 1: {
        if (key === 83) sc.mapIndex = word();
        else {
          const n = word();
          const list = [];
          for (let k = 0; k < n; k++) list.push(xy(word()));
          if (key === 66) sc.bloom.push(...list);
          else sc.field.push(...list);
        }
        break;
      }
      case 2:
      case 3:
      case 4:
      case 5: {
        const h = house(section);
        const v = word();
        if (key === 81) h.quota = v;
        else if (key === 67) h.credits = v;
        else if (key === 66) h.brain = v === 72 ? "human" : "cpu";
        else if (key === 77) h.maxUnits = v;
        break;
      }
      case 6:
        sc.choam.set(key, word());
        break;
      case 7: {
        const [h, aiMode, movement, min, max] = [word(), word(), word(), word(), word()];
        sc.teams.push({
          house: h,
          aiMode: String.fromCharCode(aiMode),
          movement: String.fromCharCode(movement),
          min,
          max
        });
        break;
      }
      case 8: {
        const [h, type, hp, pos, orientation, action] = [word(), word(), word(), word(), word(), word()];
        sc.units.push({ house: h, type, hp, ...xy(pos), orientation, action });
        break;
      }
      case 9:
        if (key === 73) {
          word();
          const [h, type, hp, pos] = [word(), word(), word(), word()];
          sc.structures.push({ house: h, type, hp, ...xy(pos) });
        } else {
          const [pos, h, type] = [word(), word(), word()];
          sc.structures.push({ house: h, type, hp: 256, ...xy(pos) });
        }
        break;
      case 10:
        sc.reinforcements.push({ values: [word(), word(), word(), word()] });
        break;
      default:
        throw new Error(`${name}: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0441\u0435\u043A\u0446\u0438\u044F ${section} \u043F\u043E \u0441\u043C\u0435\u0449\u0435\u043D\u0438\u044E ${(p - start).toString(16)}`);
    }
  }
  sc.houses = [...houses.values()];
  return sc;
}

// web/src/rom/dune.ts
var ROM = {
  /** иконки клеток: 362 записи по 16 слов плоскости (4×4 тайла) */
  iconTable: 306672,
  iconCount: 362,
  /** тайлы ландшафта и зданий: 8 LCW-потоков → адрес в VRAM */
  terrainVram: [
    [771384, 0],
    [773442, 4096],
    [776052, 8192],
    [778764, 12288],
    [781612, 16384],
    [784630, 20480],
    [787712, 24576],
    [790416, 28672]
  ],
  /** игровая палитра, 4 строки CRAM */
  gamePalette: 683160,
  /** готовые карты миссий: 27 указателей, бит 31 — карта 32×32 */
  mapTable: 111226,
  mapCount: 27,
  /** картинки меню строительства 96×56 */
  structurePictureTable: 557732,
  structurePictureCount: 19,
  unitPictureTable: 586192,
  unitPictureCount: 19,
  /** группы иконок по типам (как iconMap в PC); сразу за ними идёт iconTable */
  iconGroups: 305712,
  /** список загрузки спрайтов в VRAM: [слово адрес VRAM][слово длина в словах][длинное слово источник, бит 31 — без сжатия] */
  spriteLoadTable: 42124,
  /** кадры спрайтов: [длинное слово источник тайлов, бит 31 — сырые тайлы в ROM][флаг<<24 | описание кусков] */
  frameTable: 396940,
  /** указатели на описания юнитов (+70 — первый кадр, +76 — способ выбора кадра) */
  unitInfoTable: 443836,
  unitTypeCount: 27,
  /** строка палитры по дому: слово плоскости, биты 13–14 */
  housePalette: 38280,
  /** направление → [смещение кадра, отражение] для 8 и 16 направлений и для пехоты */
  dir8: 444008,
  dir16: 444040,
  dirInfantry: 443976,
  /** фазы шага пехоты, 4 байта */
  infantryAnim: 444104,
  /** кадры звуковой волны по 16 направлениям (код $0124AC) */
  sonicFrames: 444108,
  /** башни танка и осадного танка: тип юнита → таблица кадров */
  turretFrames: { 9: 191610, 10: 193274 },
  /** то же сразу после выстрела (отдача башни): ставятся в $044B74 через $2EC6E/$2EC74 */
  recoilFrames: { 9: 194938, 10: 196602 },
  /**
   * Значки над зданиями игрока ($00DC9C): таблицы описаний кадров по индексу, индекс 3 — двор (центр 2×2),
   * 6 — дворец (центр 3×3). Смещение куска — от левого верхнего угла здания. Тайлы уже в VRAM спрайтов.
   */
  statusIcons: {
    /** «OK»: заказ двора готов, ракета дворца готова ($009A66) */
    ok: 39610,
    /** молоток: здание ремонтируется ($009B2A) */
    repair: 416254,
    /** молния над ветряком при нехватке энергии ($009ADA) — одно описание, не таблица */
    lightning: 415976
  },
  /** курсоры карты: атака, движение, рамка, подтверждение — по 0x100 байт сырых тайлов */
  cursorTiles: 411974,
  cursorPaletteLine: 3
};
var MAP_SIZE = 64;
var RomError = class extends Error {
};
var DuneRom = class _DuneRom {
  bytes;
  title;
  constructor(bytes) {
    this.bytes = bytes;
    this.title = _DuneRom.readTitle(bytes);
    _DuneRom.validate(bytes);
  }
  /** Имя игры из заголовка ($150, 48 байт). */
  static readTitle(bytes) {
    let s = "";
    for (let i = 336; i < 384; i++) s += String.fromCharCode(bytes[i]);
    return s.trim();
  }
  static validate(bytes) {
    if (bytes.length < 1048576) throw new RomError("\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u0439 \u0434\u043B\u044F ROM Mega Drive (\u043D\u0443\u0436\u0435\u043D 1 \u041C\u0411).");
    if (String.fromCharCode(...bytes.subarray(256, 260)) !== "SEGA")
      throw new RomError(
        "\u042D\u0442\u043E \u043D\u0435 ROM Mega Drive: \u043D\u0435\u0442 \u043F\u043E\u0434\u043F\u0438\u0441\u0438 SEGA \u043F\u043E \u0430\u0434\u0440\u0435\u0441\u0443 0x100. \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0444\u0430\u0439\u043B \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 .smd \u2014 \u043D\u0443\u0436\u0435\u043D .bin/.gen/.md."
      );
    if (!_DuneRom.readTitle(bytes).startsWith("DUNE"))
      throw new RomError(`\u042D\u0442\u043E \u0434\u0440\u0443\u0433\u0430\u044F \u0438\u0433\u0440\u0430: \xAB${_DuneRom.readTitle(bytes)}\xBB. \u041D\u0443\u0436\u043D\u0430 Dune: The Battle for Arrakis.`);
    try {
      for (const [src] of ROM.terrainVram) lcwDecompress(bytes, src);
    } catch {
      throw new RomError("\u0412\u0435\u0440\u0441\u0438\u044F ROM \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u043E\u0439: \u0442\u0430\u0439\u043B\u044B \u043B\u0430\u043D\u0434\u0448\u0430\u0444\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u043F\u043E \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u043C \u0430\u0434\u0440\u0435\u0441\u0430\u043C.");
    }
  }
  cache = /* @__PURE__ */ new Map();
  memo(key, make) {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key);
  }
  /** VRAM с тайлами ландшафта и зданий, как после загрузки миссии. */
  terrainVram() {
    return this.memo("terrainVram", () => {
      const vram = new Uint8Array(65536);
      for (const [src, dst] of ROM.terrainVram) vram.set(lcwDecompress(this.bytes, src).data, dst);
      return vram;
    });
  }
  /** VRAM с тайлами спрайтов поверх тайлов ландшафта (список загрузки $00A48C). */
  spriteVram() {
    return this.memo("spriteVram", () => {
      const vram = this.terrainVram().slice();
      for (let p = ROM.spriteLoadTable; ; p += 8) {
        const dst = readU16(this.bytes, p);
        const words = readU16(this.bytes, p + 2);
        const src = readU32(this.bytes, p + 4);
        if (!dst && !words) break;
        const addr = src & 16777215;
        const data = src & 2147483648 ? this.bytes.subarray(addr, addr + words * 2) : lcwDecompress(this.bytes, addr).data.subarray(0, words * 2);
        vram.set(data, dst);
      }
      return vram;
    });
  }
  frame(index) {
    const p = ROM.frameTable + index * 8;
    const tiles = readU32(this.bytes, p);
    const def = readU32(this.bytes, p + 4);
    return this.frameDef(def & 16777215, index, def >>> 24, tiles & 2147483648 ? tiles & 16777215 : null);
  }
  /** Описание кадра: [слово кол-во кусков − 1], затем куски по 12 байт (y, размер, атрибуты, x). */
  frameDef(addr, index = -1, flag = 0, rawSource = null) {
    const count = readU16(this.bytes, addr) + 1;
    const pieces = [];
    const s162 = (at) => readU16(this.bytes, at) << 16 >> 16;
    for (let i = 0; i < count; i++) {
      const p = addr + 2 + i * 12;
      const size = readU16(this.bytes, p + 6);
      pieces.push({
        y: s162(p + 4),
        x: s162(p + 10),
        tw: (size >> 10 & 3) + 1,
        th: (size >> 8 & 3) + 1,
        attr: readU16(this.bytes, p + 8)
      });
    }
    return { index, pieces, flag, rawSource };
  }
  unitDisplay(type) {
    if (type === 27) type = 9;
    else if (type === 28) type = 1;
    const info = readU32(this.bytes, ROM.unitInfoTable + type * 4);
    return {
      baseFrame: readU16(this.bytes, info + 70),
      mode: readU16(this.bytes, info + 76) << 16 >> 16
    };
  }
  housePaletteLine(house) {
    return readU16(this.bytes, ROM.housePalette + (house & 7) * 2) >> 13 & 3;
  }
  /** Номера иконок группы: в начале таблицы — 27 смещений групп (в словах), дальше сами номера. */
  iconGroup(group) {
    const base = ROM.iconGroups;
    const from = readU16(this.bytes, base + group * 2);
    const to = group + 1 < 27 ? readU16(this.bytes, base + (group + 1) * 2) : (ROM.iconTable - base) / 2;
    const out = new Uint16Array(to - from);
    for (let i = 0; i < out.length; i++) out[i] = readU16(this.bytes, base + (from + i) * 2);
    return out;
  }
  files() {
    return this.memo("files", () => readFiles(this.bytes));
  }
  /** Сценарий миссии: дом A/O/H, номер миссии 1..9. */
  scenario(house, mission) {
    const name = `SCEN${house}00${mission}.INI`;
    const at = this.files().get(name);
    if (at === void 0) throw new RomError(`\u0412 ROM \u043D\u0435\u0442 \u0444\u0430\u0439\u043B\u0430 ${name}`);
    return parseScenario(this.bytes, name, at);
  }
  gamePalette() {
    return this.memo("gamePalette", () => this.readPalette(ROM.gamePalette, 4));
  }
  readPalette(addr, lines) {
    const pal = new Uint32Array(lines * 16);
    for (let i = 0; i < lines * 16; i++) pal[i] = cramToRGBA(readU16(this.bytes, addr + i * 2));
    return pal;
  }
  icon(id) {
    const words = new Uint16Array(16);
    const p = ROM.iconTable + id * 32;
    for (let i = 0; i < 16; i++) words[i] = readU16(this.bytes, p + i * 2);
    return words;
  }
  /** Карта миссии 1..27. Загрузчик игры ($01B1DE) заменяет иконку B0 на 7F и C0 на BF. */
  missionMap(index) {
    if (index < 1 || index > ROM.mapCount) throw new RangeError(`\u043D\u0435\u0442 \u043A\u0430\u0440\u0442\u044B ${index}`);
    const ptr = readU32(this.bytes, ROM.mapTable + (index - 1) * 4);
    const small = ptr >>> 31 === 1;
    const addr = ptr & 2147483647;
    const size = small ? 32 : 64;
    const offset = small ? 16 : 0;
    const ground = new Uint16Array(MAP_SIZE * MAP_SIZE);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let id = this.bytes[addr + y * size + x];
        if (id === 176) id = 127;
        else if (id === 192) id = 191;
        ground[(y + offset) * MAP_SIZE + x + offset] = id;
      }
    return { index, ground, bounds: { x: offset, y: offset, w: size, h: size } };
  }
  unitPictures() {
    return this.memo("unitPictures", () => this.pictureTable(ROM.unitPictureTable, ROM.unitPictureCount));
  }
  structurePictures() {
    return this.memo(
      "structurePictures",
      () => this.pictureTable(ROM.structurePictureTable, ROM.structurePictureCount)
    );
  }
  pictureTable(table, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const pic = this.picture(readU32(this.bytes, table + i * 4), i);
      if (pic) list.push(pic);
    }
    return list;
  }
  /**
   * Картинка «палитра + карта тайлов + LCW-тайлы»: 16 слов CRAM, карта w×h слов (с отражениями),
   * слово длины, поток LCW. Если по адресу не палитра или поток не распаковывается — null.
   */
  picture(addr, id, w = 12, h = 7) {
    const b = this.bytes;
    for (let i = 0; i < 16; i++) if (readU16(b, addr + i * 2) & 61713) return null;
    const pal = this.readPalette(addr, 1);
    let tiles;
    try {
      tiles = lcwDecompress(b, addr + 32 + w * h * 2 + 2).data;
    } catch {
      return null;
    }
    const width = w * 8;
    const height = h * 8;
    const px = new Uint32Array(width * height);
    for (let t = 0; t < w * h; t++) {
      const word = readU16(b, addr + 32 + t * 2);
      const tile2 = word & 2047;
      if (tile2 * 32 + 32 > tiles.length) return null;
      const hflip = word & 2048;
      const vflip = word & 4096;
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 8; col++) {
          const sx = hflip ? 7 - col : col;
          const sy = vflip ? 7 - row : row;
          const byte = tiles[tile2 * 32 + sy * 4 + (sx >> 1)];
          const c = sx & 1 ? byte & 15 : byte >> 4;
          px[(t / w | 0) * 8 * width + row * width + t % w * 8 + col] = pal[c];
        }
    }
    return { id, width, height, pixels: new Uint8ClampedArray(px.buffer) };
  }
};
export {
  ACTION,
  DuneRom,
  G,
  Game,
  INDEX_INVALID,
  STATE,
  STRUCTURE,
  UNIT,
  mapChangeSpiceAmount,
  mapGetLandscapeType,
  packTile,
  packXY,
  scriptFunctionsUnit,
  structureCreate,
  structureRemove,
  tileCenter,
  unitCreate,
  unitHide,
  unitInfo,
  unpackTile
};
