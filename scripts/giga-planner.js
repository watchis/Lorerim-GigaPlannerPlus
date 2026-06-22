var perksList = [];
var racesList = [];
var gameMechanicsList = [];
var presetList = [];
var blessingsList = [];
var curPerkList;
var curRaceList;
var curGameMechanics;
var curPreset;
var curBlessingList;
var activeSkill = 0;
var tookPerkWithLastClick = false;
var copiedMessageTimeoutID = -1;
var freePerks = [418, 2, 4, 5, 6, 7, 8, 9, 10 ,11]

var characterData = {
  race: 0, //This is an index into the race data array
  hmsIncreases: [],
  skillLevels: [],
  perksTaken: [],
  oghmaChoice: 0, //0 for nothing, 1 for health, 2 for magicka, 3 for stam
  perkListID: 0,
  raceListID: 0,
  gameMechanicsListID: 0,
  level: 1,
  attrIncreases: 0,
  earnedPerks : 3,
  earnedAttributes: 0,
  spentPerks: 0, //The number of perks actually taken
  standingStone : 0,
  blessing : 0,
};

//Returns the preset number given in the URL.
//Returns 0 if one was not given
function parsePresetFromURL(){
  const queryString = window.location.search;
  const params = new URLSearchParams(queryString);
  if(params.has("p")){
    let presetNum = Number(params.get("p"));
    if(isNaN(presetNum) || presetNum < 0 || presetNum > presetList.length){
      presetNum = 0;
    }
    return presetNum;
  }
  else {
    return 0;
  }
  
}

//Sort all of the data lists by name alphabetically
function sortDataLists(){
  perksList.sort(dataArrayCompare);
  racesList.sort(dataArrayCompare);
  gameMechanicsList.sort(dataArrayCompare);
  presetList.sort(dataArrayCompare);
}

//Helper function for sorting an array of game data by their names
function dataArrayCompare(a,b){
  return a.name.localeCompare(b.name);
}

//Initialize character data from the build code if one
//was given. Otherwise have a completely blank character.
//Returns true if character data was successfully parsed
//from the build code.
function initCharacterData(){
  let gotFromURL = parseCharacterDataFromURL();
  if(!gotFromURL){
    characterData.race = 0;
    characterData.hmsIncreases = [0,0,0];
    characterData.skillLevels = [];
    for(let i = 0; i < 20; i++){
      characterData.skillLevels.push(raceListData[0].startingSkills[i]);
    }
    characterData.perksTaken = [];
    for(let i = 0; i < curPerkList.perks.length; i++){
      characterData.perksTaken.push(false);
    }
    characterData.oghmaChoice = 0;
    characterData.perkListID = 0;
    characterData.raceListID = 0;
    characterData.gameMechanicsListID = 0;
    characterData.level = 1;
    characterData.attrIncreases = 0;
    characterData.earnedPerks = curGameMechanics.initialPerks;
    characterData.spentPerks = 0;
    characterData.standingStone = 0;
    characterData.blessing = 0;
    characterData.earnedAttributes = 0;
  }
  
  return gotFromURL;
}

//Update the table of derived attributes on the left panel.
//TODO: change this to add effects to the character to be used
//in calculating final attribute values.
function updateDerivedAttributes(){
	
	
	
  let derAttrData = curGameMechanics.derivedAttributes;
  let baseAttributes = calcBaseAttributes();
    for(let i = 0; i < derAttrData.attribute.length; i++){
    let weightedSum = baseAttributes[0] * derAttrData.weight_health[i];
    weightedSum += baseAttributes[1] * derAttrData.weight_magicka[i];
    weightedSum += baseAttributes[2] * derAttrData.weight_stamina[i];

    let bonus = 0;
     if(weightedSum > derAttrData.threshold[i]){
      bonus += derAttrData.prefactor[i] * Math.sqrt(weightedSum - derAttrData.threshold[i]);
      bonus = Math.floor(bonus);
	}
	
    bonus = "+" + bonus;

    if(derAttrData.isPercent[i]){
     bonus += "%";
    };
    $(`#derivedAttributeValue${i}`).html(bonus);
  }
}

//Determine the base attributes for the character: starting race value + any selected increases.
function calcBaseAttributes(){
  let theAnswer = [0,0,0];
  for(let i = 0; i < 3; i++){
    theAnswer[i] = curRaceList[characterData.race].startingHMS[i];
    theAnswer[i] += curGameMechanics.leveling.hmsGiven[i] * characterData.hmsIncreases[i];
  }
  return theAnswer;
}
//Remove all perks from the skill and set the skill level back
//to the starting value for the race. Set skillNum to -1 to do this
//for ALL skills. Then update the character level and earned perks.
function resetSkill(skillNum){
  let removeAll = skillNum == -1;
  if(removeAll){
    for(let i = 0; i < 21; i++){
      characterData.skillLevels[i] = 
        curRaceList[characterData.race].startingSkills[i];
    }
  }
  characterData.skillLevels[skillNum] = 
    curRaceList[characterData.race].startingSkills[skillNum];
    
  for(let i = 0; i < curPerkList.perks.length; i++){
    if( (removeAll || curPerkList.perks[i].skill == skillNum) 
      && characterHasPerk(i) ){
      removePerkAndDependents(i);
    }
  }
}

//Change the character's race to the new one with the number given.
//If respectOld is true, the starting skills of the old race will
//be taken into account when determining new skills levels. Otherwise
//just take into account the starting skills of the new race.
function changeRace(newRaceNum,respectOld = true){
  let oldRaceNum = characterData.race;
  let oldRace = curRaceList[oldRaceNum];
  let newRace = curRaceList[newRaceNum];
  
  //Adjust skills based for the new race.
  //If skills are below the staring value for the new race,
  //bring them up to the new level. If a skill is at the staring
  //value for the old race, set it to the starting value for the
  //new race.
  for(let i = 0; i < 21; i++){
    if(!respectOld || (characterData.skillLevels[i] < newRace.startingSkills[i] || 
       characterData.skillLevels[i] == oldRace.startingSkills[i])){
      characterData.skillLevels[i] = newRace.startingSkills[i];
    }
  }
  
  characterData.race = newRaceNum;
  
  updateCharacterLevelAndResults();
  updateCircleAndLineColors();
  updateSkillLevelsDisplay();
  updateDerivedAttributes();
  $("#activeSkillLevelInput").val(characterData.skillLevels[activeSkill]);
  $("#activeSkillLevelInput").attr("min",newRace.startingSkills[activeSkill]); 
}



//Remove perks from the given skill that the character should no longer have
//because the skill level is now too low.
//Returns true if a perk was removed and we need to redraw
//the active skill display.
//If input skillNum = -1, check all skills.
function removeInvalidPerks(skillNum){
  let answer = false;
  let skillLev = characterData.skillLevels[skillNum];
  let checkAll = skillNum == -1;
  
  for(let i = 0; i < curPerkList.perks.length; i++){
    if( (curPerkList.perks[i].skill != skillNum && !checkAll) || !characterHasPerk(i)){
          continue;
    }
    if(skillLev < curPerkList.perks[i].skillReq){
      removePerkAndDependents(i);
      answer = true;
    }
  }
  
  return answer;
}

//Force the character into a state where we can take the given perk
//and then take the perk. That is, set the appropriate skill level to
//take the given perk if it isn't high enough and take all of the pre-reqs
//Assumes that the skill level requirement for a perk is greater or equal
//to the skill req for all pre-reqs. Returns true if a perk was actually taken.
//Do not actually do anything if the we would need to choose between multiple
//perks in order to take this one. (i.e. one of the pre-reqs has an OR condition in
//it's pre-reqs)
function forceTakePerk(perkNum){
  let thePerk = curPerkList.perks[perkNum];
  let hasPerk = characterHasPerk(perkNum);
  let meetsSkillReq = thePerk.skillReq <= characterData.skillLevels[thePerk.skill]
  
  if(wouldNeedChoiceToForce(perkNum)){
    let errorMessage = "This perk requires at least one of the following other perks: ";
    for(let i = 0; i < thePerk.preReqs.length; i++){
      if(thePerk.preReqs[i] < 0){
        errorMessage += curPerkList.perks[Math.abs(thePerk.preReqs[i])].name;
        if(curPerkList.perks[Math.abs(thePerk.preReqs[i])].placeInChain > 0){
          errorMessage += " " + curPerkList.perks[Math.abs(thePerk.preReqs[i])].placeInChain;
        }
        if(i == (thePerk.preReqs.length - 1)){
          errorMessage += ". ";
        }
        else{
          errorMessage += ", ";
        }
      }
    }
    errorMessage += "Select one of those perks first before selecting this one.";
    errorMessage = errorMessage.replace(/<br>/g," ");
    $("#highlightedPerkDesc").html(errorMessage);
    $("#highlightedPerkDiv").addClass("errorMessageDiv");
    return false;
  }
  
  if(!meetsSkillReq){
    characterData.skillLevels[thePerk.skill] = thePerk.skillReq;
  }
  
  let tookPerk = false;
  
  for(let i = 0; i < thePerk.preReqs.length; i++){
    if(thePerk.preReqs[i] >= 0){
      tookPerk = forceTakePerk(thePerk.preReqs[i]) | tookPerk;
    }
  }
  
  if(!hasPerk){
    actuallyTakePerk(perkNum);
    tookPerk = true;
  }
  
  return tookPerk;
  }

//Returns true if in the course of force taking the given perk
//we would need to make a choice about which of the OR pre-reqs
//to take. If there is an OR but we already have one of them, that's fine.
function wouldNeedChoiceToForce(perkNum){
  //first check this perk to see if there's an OR that we don't satisfy
  let thePerk = curPerkList.perks[perkNum];
  let hasOrPerks = false;
  let satisfiesOrPerks = false;
  for(let i = 0; i < thePerk.preReqs.length; i++){
    if(thePerk.preReqs[i] < 0){
      hasOrPerks = true;
      if(characterHasPerk(Math.abs(thePerk.preReqs[i]))){
        satisfiesOrPerks = true;
      }
    }
  }
  
  if(hasOrPerks && !satisfiesOrPerks) return true;
  
  //Then recursively check all of the hard requirements 
  for(let i = 0; i < thePerk.preReqs.length; i++) {
    if(thePerk.preReqs[i] >= 0 && wouldNeedChoiceToForce(thePerk.preReqs[i])){
      return true;
    }
  }
  
  return false;
}

//Attempt to take the given perk. Can fail if the pre-reqs for
//the perk are not met. Updates the displays if the perk is taken.
//Return true if a perk was taken
function tryTakePerk(perkNum){

  if(!canTakePerk(perkNum)) return false;
  
  actuallyTakePerk(perkNum);
  updateActiveSkillPanel();
  updateCircleAndLineColors();
  return true;
}

//Check if the given perk can actually be taken
function canTakePerk(perkNum){
  if(perkNum < 0) return false;
  if(calcFreePerks() < 1) return false;
  if(characterHasPerk(perkNum)) return false;
  if(!hasPerkPreReqs(perkNum)) return false;
  
  return true;
}

//Return true if the character meets ALL of the pre-reqs for taking the give perk
function hasPerkPreReqs(perkNum){
  let hasOrPerks = false;
  let satisfiesOrPerks = false;
  
  if(curPerkList.perks[perkNum].skillReq > characterData.skillLevels[curPerkList.perks[perkNum].skill])
    return false;
  
  for(let i = 0; i < curPerkList.perks[perkNum].preReqs.length; i++){
    if(curPerkList.perks[perkNum].preReqs[i] < 0){
      hasOrPerks = true;
      if(characterHasPerk(Math.abs(curPerkList.perks[perkNum].preReqs[i]))){
        satisfiesOrPerks = true;
      }
    }
    else{
      if(!characterHasPerk(curPerkList.perks[perkNum].preReqs[i])) return false;
    }
  }
  
  if(hasOrPerks && !satisfiesOrPerks) return false;
  
  return true;
}

//Take the perk. Assumes that all the prerequisites are satisfied.
function actuallyTakePerk(perkNum){
	characterData.perksTaken[perkNum] = true;
	if (curPerkList.perks[perkNum].skill < 18 && !freePerks.includes(perkNum)){
  		characterData.spentPerks++;
  }
 updateDerivedAttributes()
}

//Remove the perk. Assumes that the perk has actually been taken.
function actuallyRemovePerk(perkNum){
  characterData.perksTaken[perkNum] = false;
	if (curPerkList.perks[perkNum].skill < 18 && !freePerks.includes(perkNum)){
		characterData.spentPerks--;
	}
 updateDerivedAttributes()
}

//Recursively remove the given perk and all of the perks that require
//it to be taken. Assumes the given perk can actually be removed.
function removePerkAndDependents(perkNum){
  actuallyRemovePerk(perkNum);
  for(let i = 0; i < curPerkList.perks.length; i++){
    if(characterHasPerk(i) && !hasPerkPreReqs(i)){
      removePerkAndDependents(i);
    }
  }
}

//Attempt to remove the given perk. Does nothing if the character
//does not actually have the perk.
function tryRemovePerk(perkNum){ 
  //Basic sanity check
  if(!characterHasPerk(perkNum)) return;
  
  removePerkAndDependents(perkNum);
  updateActiveSkillPanel();
  updateCircleAndLineColors();
}

//Returns true if the character has the given perk
function characterHasPerk(perkNum){
  return characterData.perksTaken[perkNum];
}

//Don't need to do any processing here (yet).
function addRaceData(raceData){
  racesList.push(raceData);
}

//Don't need to do any processing here (yet).
function addBlessingsData(blessingData){
  blessingsList.push(blessingData);
}

//Do some additional processing on the perk data,
//primarily to identify skill chains and add some extra
//fields to make dealing with them easier.
function addPerkData(perkData){
  //First add the prevPerk property
  for(let i = 0; i < perkData.perks.length; i++){
    let nextPerk = perkData.perks[i].nextPerk
    if(nextPerk != -1){
      perkData.perks[nextPerk].prevPerk = i;
    }
  }
  //Then find those with the prevPerk property defined and nextPerk == -1
  //These are the ends of the chains
  //If prevPerk isn't defined and nextPerk is -1, then it's not in a chain at all.
  for(let i = 0; i < perkData.perks.length; i++){

    if( !("prevPerk" in perkData.perks[i]) && perkData.perks[i].nextPerk == -1){
      //Not in chain
      perkData.perks[i].prevPerk = -1;
      perkData.perks[i].totalInChain = -1;
      perkData.perks[i].placeInChain = -1;
    }
    else if(perkData.perks[i].nextPerk != -1 && !("prevPerk" in perkData.perks[i])){
      perkData.perks[i].prevPerk = -1;
      //The start of a chain
      //First count how many are in the chain
      let totalInChain = 1;
      let checking = i;
      
      while(perkData.perks[checking].nextPerk != -1){
        totalInChain++;
        checking = perkData.perks[checking].nextPerk; 
      }
      //Then add the total and running total to each in the chain
      checking = i;
      for(let j = 1; j <= totalInChain; j++){
        perkData.perks[checking].totalInChain = totalInChain;
        perkData.perks[checking].placeInChain = j;
        checking = perkData.perks[checking].nextPerk; 
      }
    }
  }
  
  perksList.push(perkData);
}

//A little processing to do here: build a table of the cumulative amount
//of character XP is needed to get to each level
function addGameMechanicsData(gameData){
  
  gameData.xpTable = [0];
  
  for(let i = 1; i < 101; i++){
    gameData.xpTable.push(
       gameData.xpTable[i-1] + gameData.leveling.base + i * gameData.leveling.mult);
  }
  
  gameMechanicsList.push(gameData);
}

//Don't need to to any pre-processing here.
function addPresetData(presetData){
  presetList.push(presetData);
}

//Search the given array of data for the one with id given.
//Return the index into the arra of data where it is found, -1 if it is not found.
function getIndexWithID(id,dataArray){
  for(let i = 0; i < dataArray.length; i++){
    if(dataArray[i].id == id) return i;
  }
  return -1;
}

//Calculate how many free perks the character has left.
function calcFreePerks(){
  return characterData.earnedPerks - characterData.spentPerks;
}

//Calculate how many sub-class points the character has left.
function calcClassPoints(){
 let level = characterData.level
 let earnedClassPoints = 1
 let spentClassPoints = 0
 if(level<30){
	earnedClassPoints = 1 + Math.floor(level/5);
	}else {earnedClassPoints = 7;}
for(let i = 0; i < curPerkList.perks.length; i++){;
    if (characterHasPerk(i) && curPerkList.perks[i].skill == 18){
   	spentClassPoints += 1;}
}
 return earnedClassPoints - spentClassPoints
}

//Calculate how many trait points the character has.
function calcTraitPoints(){
let answer = 0;
for(let i = 0; i < curPerkList.perks.length; i++){
let n = (curPerkList.perks[i].skillReq);
if (curPerkList.perks[i].skill > 18){
    if (characterHasPerk(i)){
   	answer += n;}
	}
	}return answer;
 }
 
//Calculate how many traits slots the character has left.
function calcFreeTraits(){
let perks = curPerkList.perks;
let answer = 0;
for(let i = 0; i < perks.length; i++){
let thePerk = curPerkList.perks[i];
let hasPerk = characterHasPerk(i);
let isFirstInChain = thePerk.preReqs <= 0 ;
    if (thePerk.skill > 18){
		if(hasPerk && isFirstInChain){
   	answer += 1
		}
	}
}
answer = 2 - answer
return answer;
 }

//Get what level the player should be based on the skill levels
function calcLevel(){
  let totalXP = calcTotalXP();
  let minlevel = 1
  //check highest skill level for level cap + sub-class level req
  for (let i = 0; i < 18; i++){
	  let baseSkill = raceListData[characterData.race].startingSkills[i];
	  let currentSkill = characterData.skillLevels[i];
	  let levelReq = currentSkill - 50
	  if(minlevel < levelReq){
		  minlevel = levelReq
	  }
	  if (minlevel <= Math.floor(((currentSkill - baseSkill)/5) + 1)){
		  minlevel = (Math.ceil((currentSkill - baseSkill)/5)+ 1)
	  }
      if (characterData.skillLevels[18] > minlevel){
	  minlevel = characterData.skillLevels[18]
	  }
  }
  //Don't need to check i=0 because the value there should always be 0
  for(let i = 1; i < curGameMechanics.xpTable.length; i++){
    if(totalXP < curGameMechanics.xpTable[i]) return Math.max(minlevel, i);
  }
  return 1
}
  
//Calculate how much character XP has been earned based on skill levels
function calcTotalXP(){
let answer = -60;
for(let i = 0; i < 18; i++){
	let baseSkill = raceListData[characterData.race].startingSkills[i];
	let currentSkill = characterData.skillLevels[i];
	
	if (currentSkill <= 25) {
		n = currentSkill - baseSkill;
	} else if (currentSkill <= 50) {
		n = 25 + ((currentSkill - 25) * 2) - baseSkill;
	} else if (currentSkill <= 75) {
		n = 75 + ((currentSkill - 50) * 3)  - baseSkill; 
	} else if (currentSkill <= 100) {
		n = 150 + ((currentSkill - 75) * 6) - baseSkill;
	}
    answer += (n);
  }
  return answer;
}

//Calculate how many attribute choices the player should be able to make.
function calcFreeAttributeChoices(){
  return characterData.earnedAttributes - (characterData.hmsIncreases[0] +
    characterData.hmsIncreases[1] + characterData.hmsIncreases[2]);
}

//Generate just the build code part of the build sharing URL,
//i.e. b=?

//kind of butchered the code build by changing the way the races/blessings worked. String.fromCodePoint(0) in place so previous saved links should still work
function generateBuildCode(){
  let version = 2;
  let code = String.fromCodePoint(version);
  code += String.fromCodePoint(curPerkList.id);
  code += String.fromCodePoint(0);
  code += String.fromCodePoint(curGameMechanics.id);
  code += String.fromCodePoint(0);
  code += String.fromCodePoint(characterData.level);
  code += String.fromCodePoint(characterData.hmsIncreases[0]);
  code += String.fromCodePoint(characterData.hmsIncreases[1]);
  code += String.fromCodePoint(characterData.hmsIncreases[2]);
  for(let i = 0; i < 18; i++){
    code += String.fromCodePoint(characterData.skillLevels[i]);
  }
  code += String.fromCodePoint(characterData.oghmaChoice << 4);
  code += String.fromCodePoint(characterData.race);
  code += String.fromCodePoint(characterData.standingStone);
  code += String.fromCodePoint(characterData.blessing);
  
  let paddingNeeded = 8 - (characterData.perksTaken.length % 8);
  if (paddingNeeded == 8) paddingNeeded = 0;
  let character = 0;
  for(let i = 0; i < characterData.perksTaken.length; i++){
    character = (character << 1) | (characterData.perksTaken[i]);
    if(i % 8 == 7){
      code += String.fromCodePoint(character);
      character = 0;
    }
  }
  if(paddingNeeded != 0){
    code += String.fromCodePoint(character << paddingNeeded);
  }
  
  code = btoa(code);
  //Use base64url encoding
  code = code.replace(/\+/g,"-");
  code = code.replace(/\//g,"_");
  //Trim padding characters because they are not needed.
  if(code.indexOf("=") != -1){
    code = code.substring(0,code.indexOf("="));
  }
  
  return code;
}

//Update the character data from the build code given in the URL.
//returns true if build data was found and successfully decoded.
function parseCharacterDataFromURL(){
  const queryString = window.location.search;
  const params = new URLSearchParams(queryString);
  if(!params.has("b")){
    return false;
  }
  let buildCode = params.get("b");
  //Back to regular base64
  buildCode = buildCode.replace(/-/g,"+");
  buildCode = buildCode.replace(/_/g,"/");
  //decode
  buildCode = atob(buildCode);
  let version = buildCode.charCodeAt(0);
  if(version == 1){
    return buildCodeParserV1(buildCode);
  }
  else if(version == 2){
    return buildCodeParserV2(buildCode);
  }
  else{
    return false;
  }
}

//Decode build data made using v1 of the encoder
function buildCodeParserV1(buildCode){
  let perkListID = buildCode.charCodeAt(1);
  curPerkList = perksList[getIndexWithID(perkListID,perksList)];
  let raceListID = buildCode.charCodeAt(2);
  curRaceList = raceListData;
  let gmID = buildCode.charCodeAt(3);
  curGameMechanics = gameMechanicsList[getIndexWithID(gmID,gameMechanicsList)];
  let blessingsID = buildCode.charCodeAt(4);
  curBlessingList = blessingsData;
  
  characterData.level = buildCode.charCodeAt(5);
  characterData.hmsIncreases[0] = buildCode.charCodeAt(6);
  characterData.hmsIncreases[1] = buildCode.charCodeAt(7);
  characterData.hmsIncreases[2] = buildCode.charCodeAt(8);
  
  characterData.skillLevels = [];
  
  for(let i = 0; i < 18; i++){
    characterData.skillLevels.push(buildCode.charCodeAt(9+i));
  }
  
  characterData.oghmaChoice = buildCode.charCodeAt(27);
  characterData.race = buildCode.charCodeAt(28);
  characterData.standingStone = buildCode.charCodeAt(29);
  characterData.blessing = buildCode.charCodeAt(30);
  characterData.perksTaken = [];
  
//this method will be kind of inefficient but EHHHHHHH
  for(let i = 0; i < curPerkList.perks.length; i++){
    let index = 31 + Math.floor(i/8);
    let offset = 7 - (i % 8);
    let hasPerk = (buildCode.charCodeAt(index) & (1 << offset)) > 0;
    characterData.perksTaken.push(hasPerk);
  };
  
  //force recalc of spent perks
  
  characterData.spentPerks = characterData.perksTaken.filter(Boolean).length;
  for(let i = 0; i < curPerkList.perks.length; i++){
	let hasPerk = characterHasPerk(i);
	let skill = curPerkList.perks[i].skill;
	if (hasPerk){
		if (freePerks.includes(i) || skill > 17){
			characterData.spentPerks--;
			}
		}	 
   }
  return true;
}

//Decode build data made using V2 of the encoder
function buildCodeParserV2(buildCode){
  let answer = buildCodeParserV1(buildCode);
  characterData.oghmaChoice = characterData.oghmaChoice >> 4;
  oghmaBonus();
  characterData.skillLevels[18] = characterData.level;
  return answer;
}

//Make sure the build is valid: all earned attributes have been spent,
//all selected perks are valid, haven't spent too many perks.
//Returns object with the following properties:
// valid: boolean
// message: if the build is not valid, a message explaining why
function validateBuild(){
  let answer = {valid: true, message: ""};
  if(calcFreeAttributeChoices() > 0){
    answer.valid = false;
    answer.message = "You need to spend all of your attributes.";
  }
  else if (calcFreeAttributeChoices() < 0){
    answer.valid = false;
    answer.message = "You have spent too many attribute increases.";
  }
  else if (calcFreePerks() < 0){
    answer.valid = false;
    answer.message = "You have too many perks.";
  }
   else if (calcFreeTraits() < 0){
    answer.valid = false;
    answer.message = "You have too many traits.";
  }
  else if (calcClassPoints() < 0){
    answer.valid = false;
    answer.message = "You have too many class points.";	
  }
  else if (!checkAllPerksValid()){
    answer.valid = false;
    answer.message = "You have a perk you don't have the pre-requisites for.";
  }
  return answer;
}

//Check if the character meets all of the pre-reqs for all of the 
//perks they have Return true if so.
function checkAllPerksValid(){
  for(let i = 0; i < characterData.perksTaken.length; i++){
    if(characterHasPerk(i) && !hasPerkPreReqs(i)){
      return false;
    }
  }
  return true;
}

//Re-calculate what the character's level should be and update the level property
//along wih the earnedAttributes and earnedPerks properties.
function calcCharacterLevelAndResults(){
  let newLevel = calcLevel();
  characterData.level = newLevel;
  characterData.earnedAttributes = newLevel - 1;
  characterData.earnedPerks = curGameMechanics.initialPerks + (newLevel-1);
  if(characterData.oghmaChoice > 0){
    characterData.earnedPerks += curGameMechanics.oghmaData.perksGiven;
  }
}

