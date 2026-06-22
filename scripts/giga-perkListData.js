const perkData = {
name : "LoreRim v4",
id: 0,
skillNames : [
  "Smithing",     // 0
  "Heavy Armor",  // 1
  "Block",        // 2
  "Two-Handed",   // 3
  "One-Handed",   // 4
  "Marksman",     // 5
  "Evasion",      // 6
  "Sneak",        // 7
  "Wayfarer",     // 8
  "Finesse",      // 9
  "Speech",       // 10
  "Alchemy",      // 11
  "Illusion",     // 12
  "Conjuration",  // 13
  "Destruction",  // 14
  "Restoration",  // 15
  "Alteration",   // 16
  "Enchanting",   // 17
  "Destiny",   	  // 18
  "Traits",	  	  // 19
],
perks : [
  /*
    {name : "", skill : 0, skillReq : 0,
    xPos : 0, yPos : 0, preReqs : [], nextPerk: -1,
    description : ""},
  */
	//0
   {name : "Craftsmanship", skill : 0, skillReq : 40,
   xPos : 250/5, yPos : 220/3.5, preReqs : [418], nextPerk: -1,
   description : "You've acquired the basics of craftsmanship and know how to properly use all kinds of tools. You've also learned the material property of every weapon and thus they offer an extra effect."}, 
   //1
  {name : "Advanced<br>Blacksmithing", skill : 0, skillReq : 50,
   xPos : 250/5, yPos : 300/3.5, preReqs : [-419,-418], nextPerk: -1,
   description : "You've gained quite some finesse, allowing you to craft plate armor and fine jewelry. You have also found a way to melt and crush certain gems into alchemically usable dust."},
   //2
  {name : "Arcane<br>Craftsmanship", skill : 0, skillReq : 60,
   xPos : 150/5, yPos : 300/3.5, preReqs : [1], nextPerk: -1,
   description : "After studying Arcane Craftsmanship, you've learned the necessary techniques to craft bolts and arrows that will explode with elemental fury upon impact. (Requires 'Arcane Craftsmanship')"},
   //3
  {name : "Legendary<br>Blacksmithing", skill : 0, skillReq : 100,
   xPos : 350/5, yPos : 300/3.5, preReqs : [1], nextPerk: -1,
   description : "You make steel sing songs on the anvil. Your hammer is no longer a mere tool, but a loom that weaves the fabric of myths. You can even improve the divine artifacts of Aedra and Daedra."},
   //4
  {name : "Advanced<br>Light Armors", skill : 0, skillReq : 25,
   xPos : 100/5, yPos : 200/3.5, preReqs : [418], nextPerk: -1,
   description : "You've been read An Introduction to Scale Armors, allowing you to craft and efficiently improve scale armor. (Requires 'An Introduction to Scale Armors')"},
   //5
  {name : "Elven Smithing", skill : 0, skillReq : 50,
   xPos : 100/5, yPos : 150/3.5, preReqs : [4], nextPerk: -1,
   description : "You've gained enough finesse to create and improve Elven armor and weapons by studying the book 'About Elven Craftsmanship' (Requires 'About Elven Craftsmanship')"},
   //6
  {name : "Glass Smithing", skill : 0, skillReq : 75,
   xPos : 50/5, yPos : 50/3.5, preReqs : [-5,-8], nextPerk: -1,
   description : "Crafting and improving Glass equipment is not for the unskilled, but having studied An Introduction to Malachite, you aren't one of them any more. (Requires 'An Introduction to Malachite')"},
   //7
  {name : "Dwarven<br>Smithing", skill : 0, skillReq : 25,
   xPos : 400/5, yPos : 200/3.5, preReqs : [418], nextPerk: -1,
   description : "You've read The Art of Dwarven Blacksmithing and acquired the secret knowledge of how to create and improve Dwarven equipment efficiently. (Requires 'The Art of Dwarven Blacksmithing')"},
   //8
  {name : "Orcish<br>Smithing", skill : 0, skillReq : 50,
   xPos : 400/5, yPos : 150/3.5, preReqs : [7], nextPerk: -1,
   description : "Orcish equipment is hard to craft, but you've got what it takes. By studying The Almanac of Orcish Blacksmithing, you can craft and improve it easily and most efficiently. (Requires 'The Almanac of Orcish Blacksmithing')"},
   //9
  {name : "Ebony Smithing", skill : 0, skillReq : 75,
   xPos : 450/5, yPos : 50/3.5, preReqs : [-8,-5], nextPerk: -1,
   description : "Ebony weapons and armor - some even fail at heating the metal. But not you. Now that you've studied 'Harder than Steel - How to work with Ebony', you can craft and improve ebony equipment with ease. (Requires 'Harder than Steel - How to work with Ebony')"},
   //10
  {name : "Daedric Smithing", skill : 0, skillReq : 100,
   xPos : 250/5, yPos : 65/3.5, preReqs : [-9,-6], nextPerk: -1,
   description : "The creation of daedric weapons and armor is a secret few mortals know - still, you managed to acquire this knowledge by reading Daedric Craftsmanship... (Requires 'Daedric Craftsmanship')"},
   //11
  {name : "Draconic Blacksmithing", skill : 0, skillReq : 100,
   xPos : 250/5, yPos : 25/3.5, preReqs : [-9,-6], nextPerk: -1,
   description : "The scales and bones of dragons are probably the hardest material to work with, but you've mastered even this art since you studied The Compendium of Dragonic Armor. (Requires 'The Compendium of Draconic Armor')"},
   //12
  {name : "Conditioning", skill : 1, skillReq : 0,
   xPos : 249/4.5, yPos : 406/4.5, preReqs : [], nextPerk: -1,
   description : "You've accustomed yourself to using heavy armor. (No stamina drain for wearing heavy armor, unique bonus when wearing high-quality materials, -35% armor weight penalty)"},
   //13
  {name : "Relentless Onslaught", skill : 1, skillReq : 20,
   xPos : 249/4.5, yPos : 311/4.5, preReqs : [12], nextPerk: -1,
   description : "After extensive training you now can sprint in heavy armor without problems. (no sprinting stamina cost penalty, take 80% less melee damage when bullrushing, -10% armor weight penalty)"},
   //14
  {name : "Devastating Tackle", skill : 1, skillReq : 50,
   xPos : 175/4.5, yPos : 250/4.5, preReqs : [13], nextPerk: -1,
   description : "When in full heavy armor, you can cause devastating impact when bull-rushing. (Bull-rush while wearing 4 or more pieces of heavy armor does double damage and has higher chance to knockdown)"},
   //15
  {name : "Combat Casting", skill : 1, skillReq : 25,
   xPos : 130/4.5, yPos : 301/4.5, preReqs : [12], nextPerk: -1,
   description : "You are able to keep concentrated enough in heavy armor. (No spell cost penalty for casting Novice and Apprentice spells in heavy armor)"},
   //16
  {name : "Combat Trance", skill : 1, skillReq : 50,
   xPos : 73/4.5, yPos : 200/4.5, preReqs : [15], nextPerk: -1,
   description : "Your heavy armor distracts you even less. (No spell cost penalty for casting Adept spells in heavy armor)"},
   //17
  {name : "Combat Meditation", skill : 1, skillReq : 75,
   xPos : 84/4.5, yPos : 110/4.5, preReqs : [16], nextPerk: -1,
   description : "You're accustomed to your heavy armor so much that you can now cast even sophisticated spells with relative ease. (No spell cost penalty for casting Expert spells in heavy armor)"},
   //18
  {name : "Battle Mage", skill : 1, skillReq : 100,
   xPos : 103/4.5, yPos : 36/4.5, preReqs : [17], nextPerk: -1,
   description : "You have mastered spellcasting while wearing heavy armor. (No spell cost penalty for casting Master spells in heavy armor, 15% less spell cost when wearing all heavy armor: head, chest, hands, feet)"},
   //19
  {name : "Combat Training", skill : 1, skillReq : 25,
   xPos : 355/4.5, yPos : 307/4.5, preReqs : [12], nextPerk: -1,
   description : "You are less hindered by your armor and can attack with ease. (No power attack stamina cost penalty, increased unarmed damage with heavy gauntlets, -10% armor weight penalty)"},
   //20
  {name : "Immovable", skill : 1, skillReq : 50,
   xPos : 337/4.5, yPos : 216/4.5, preReqs : [19], nextPerk: -1,
   description : "When in full heavy armor, you can pose a defensive stance to reduce incoming impact. (Resist physical, elemental and poise damage by 33% while attacking, casting, walking or standing still wearing 4 or more pieces of heavy armor)"},
   //21
  {name : "Fortitude", skill : 1, skillReq : 50,
   xPos : 387/4.5, yPos : 216/4.5, preReqs : [19], nextPerk: -1,
   description : "Your training made you stronger and you are now less burdened by the rigidity of your armor. (+40 stamina, +20 carry weight, -10% armor weight penalty)"},  
   //22
  {name : "Power of<br>the Combatant", skill : 1, skillReq : 75,
   xPos : 400/4.5, yPos : 140/4.5, preReqs : [21], nextPerk: -1,
   description : "Taking hits gives you a rush of adrenaline. (Restore 15 stamina over 6 seconds after taking a hit, -10% armor weight penalty)"},
   //23
  {name : "Juggernaut", skill : 1, skillReq : 100,
   xPos : 366/4.5, yPos : 36/4.5, preReqs : [22], nextPerk: -1,
   description : "You've reached perfection in the skill of wearing heavy armor and are now significantly more maneuverable in it. (15% less armor weight, 10% more armor rating, 50% less poise damage when wearing all heavy armor: head, chest, hands, feet)"},
   //24
  {name : "Mounted Combat", skill : 1, skillReq : 0,
   xPos : 366/4.5, yPos : 406/4.5, preReqs : [], nextPerk: -1,
   description : "You can deal more damage with melee weapons while mounted. (1.5x melee attack damage while on horseback) "},
   //25
  {name : "Improved Blocking", skill : 2, skillReq : 0,
   xPos : 150/3, yPos : 323/4, preReqs : [], nextPerk: -1,
   description : "You strengthened your shield arm and trained to parry blows a little. (Block 25% more damage with weapons and shields, take 25% less elemental damage when blocking with a shield and 10% less with a weapon)"},
   //26
  {name : "Experienced Blocking", skill : 2, skillReq : 20,
   xPos : 150/3, yPos : 172/4, preReqs : [25], nextPerk: -1,
   description : "With weapon or shield you can block almost any blow with rock-solid confidence. (Block 50% more damage, recover some stamina when blocking a hit)"},
   //27
  {name : "Torch Combat", skill : 2, skillReq : 25,
   xPos : 200/3, yPos : 222/4, preReqs : [25], nextPerk: -1,
   description : "You can use your torch more effectively in combat, causing painful burns. (Power bash with a torch does 10 extra fire damage and staggers the target, targets set on fire take 5 extra fire damage from weapon attacks)"},
   //28
  {name : "Strong Grip", skill : 2, skillReq : 15,
   xPos : 30/3, yPos : 239/4, preReqs : [25], nextPerk: -1,
   description : "You hold on to your shield like you would hold on to your life. (50% less shield weight, 25% more armor rating, block 40% more damage, arrows that hit the shield do no damage)"},
   //29
  {name : "Elemental Protection", skill : 2, skillReq : 50,
   xPos : 55/3, yPos : 115/4, preReqs : [28], nextPerk: -1,
   description : "You've learned how to block damaging spells more efficiently. (Take 50% less fire, frost, and shock damage when blocking with a shield)"},
   //30
  {name : "Defensive Stance", skill : 2, skillReq : 75,
   xPos : 103/3, yPos : 60/4, preReqs : [29], nextPerk: -1,
   description : "You have honed your defensive movements to perfection. (Blocking with a shield does not slow you down, 75% less shield weight, 50% more armor rating)"},
   //31
  {name : "Powerful Bashes", skill : 2, skillReq : 25,
   xPos : 250/3, yPos : 239/4, preReqs : [25], nextPerk: -1,
   description : "By gathering your strength for a short while, you can perform a much more powerful bash. (Able to do a power bash)"},
    //32
  {name : "Shield Strike", skill : 2, skillReq : 25,
   xPos : 190/3, yPos : 160/4, preReqs : [31], nextPerk: 33,
   description : "You can use your shield more offensively, using it as a deadly weapon. (50% more shield bash damage, double damage when not wearing heavy armor, 25% less shield bash stamina cost)"},  
    //33
  {name : "Shield Strike", skill : 2, skillReq : 50,
   xPos : 190/3, yPos : 160/4, preReqs : [32], nextPerk: -1,
   description : "You can use your shield more offensively, using it as a deadly weapon. (100% more shield bash damage, double damage when not wearing heavy armor, 50% less shield bash stamina cost)"},  
   //34
  {name : "Overpowering Bashes", skill : 2, skillReq : 50,
   xPos : 250/3, yPos : 175/4, preReqs : [31], nextPerk: -1,
   description : "When you put all of your power into your shield bashes, you will often overpower your foes. (Power bashing with a shield can knock down)"},
   //35
  {name : "Disarming Bash", skill : 2, skillReq : 75,
   xPos : 225/3, yPos : 75/4, preReqs : [34], nextPerk: -1,
   description : "You've trained in the art of disarming foes mid-combat. (20% chance to disarm when power bashing using a shield or weapon)"},
   //36
  {name : "Unstoppable Charge", skill : 2, skillReq : 100,
   xPos : 150/3, yPos : 30/4, preReqs : [35,30], nextPerk: -1,
   description : "When bull rushing with your shield raised, you are a tremendous force to deal with. (Sprinting with a shield raised knocks down most targets and reduces incoming damage by 50%)"},
   //37
  {name : "Great Weapon Mastery", skill : 3, skillReq : 0,
   xPos : 200/4, yPos : 362/4, preReqs : [], nextPerk: 38,
   description : "Your improved fighting techniques increase your damage dealt with two-handed weapons. (20% more damage)"},
   //38
  {name : "Great Weapon Mastery", skill : 3, skillReq : 20,
   xPos : 200/4, yPos : 362/4, preReqs : [37], nextPerk: -1,
   description : "Your improved fighting techniques increase your damage dealt with two-handed weapons even more. (40% more damage)"},
   //39
  {name : "Barbaric Might", skill : 3, skillReq : 20,
   xPos : 200/4, yPos : 300/4, preReqs : [37], nextPerk: -1,
   description : "Your power attacks become mighty blows that will penetrate armor and are less tiring. (-30% power attack stamina cost, +30% armor penetration)"},
   //40
  {name : "Quarterstaff<br>Focus", skill : 3, skillReq : 25,
   xPos : 75/4, yPos : 262/4, preReqs : [39], nextPerk: 41,
   description : "You've learned the basics of quarterstaff combat. (Deal 10 stamina damage on-hit, +5% critical hit chance)"},
   //41
  {name : "Quarterstaff<br>Focus", skill : 3, skillReq : 50,
   xPos : 75/4, yPos : 262/4, preReqs : [40], nextPerk: 42,
   description : "You've acquired the advanced techniques of quarterstaff combat. (Deal 15 stamina damage on-hit, +10% critical hit chance)"},
   //42
  {name : "Quarterstaff<br>Focus", skill : 3, skillReq : 75,
   xPos : 75/4, yPos : 262/4, preReqs : [41], nextPerk: -1,
   description : "You've become a master of quarterstaff combat. (Deal 20 stamina damage on-hit, +15% critical hit chance)"}, 
   //43
  {name : "Defensive Strike", skill : 3, skillReq : 50,
   xPos : 75/4, yPos : 212/4, preReqs : [40], nextPerk: -1,
   description : "You can more efficiently block and parry incoming attacks with quarterstaves. (quarterstaves block 50% better, and bashes do twice the damage)"}, 
   //44
  {name : "Hafted Blade<br>Focus", skill : 3, skillReq : 25,
   xPos : 125/4, yPos : 262/4, preReqs : [39], nextPerk: 45,
   description : "You've become familiar with battle axes and halberds. (Attacks deal 40 extra damage over 20 seconds, +10% armor penetration)"},
   //45
  {name : "Hafted Blade<br>Focus", skill : 3, skillReq : 50,
   xPos : 125/4, yPos : 262/4, preReqs : [44], nextPerk: 46,
   description : " become an advanced battle axe and halberd fighter. (Attacks deal 60 extra damage over 20 seconds, +20% armor penetration)"},
   //46
  {name : "Hafted Blade<br>Focus", skill : 3, skillReq : 75,
   xPos : 125/4, yPos : 262/4, preReqs : [45], nextPerk: -1,
   description : "You've become a master of battle axe and halberd combat. (Attacks deal 80 extra damage over 20 seconds, +30% armor penetration)"}, 
   //47
  {name : "Shield Breaker", skill : 3, skillReq : 50,
   xPos : 125/4, yPos : 212/4, preReqs : [44], nextPerk: -1,
   description : "Your mighty swings can cleave through target's defense, hindering them from blocking next attacks. (power attacks reduce target's blockable damage by 90% and stamina regeneration by 25% for 10 seconds)"}, 
   //48
  {name : "Longblade Focus", skill : 3, skillReq : 25,
   xPos : 275/4, yPos : 262/4, preReqs : [39], nextPerk: 49,
   description : "You've acquired the advanced techniques of using greatswords and pikes. (Attacks reduce target's melee damage by 10% for 10 seconds, +10% critical hit chance)"},
   //49
  {name : "Longblade Focus", skill : 3, skillReq : 50,
   xPos : 275/4, yPos : 262/4, preReqs : [48], nextPerk: 50,
   description : "You've acquired the advanced techniques of using greatswords and pikes. (Attacks reduce target's melee damage by 15% for 10 seconds, +20% critical hit chance)"},
   //50
  {name : "Longblade Focus", skill : 3, skillReq : 75,
   xPos : 275/4, yPos : 262/4, preReqs : [49], nextPerk: -1,
   description : "You've become a master of using greatswords and pikes. (Attacks reduce target's melee damage by 20% for 10 seconds, +30% critical hit chance)"}, 
   //51
  {name : "Reversal", skill : 3, skillReq : 50,
   xPos : 275/4, yPos : 212/4, preReqs : [48], nextPerk: -1,
   description : "With enough momentum, you can slash deeper into targets with power attacks. (+25% critical hit chance and 2x critical hit damage when power attacking)"}, 
   //52
  {name : "Warhammer<br>Focus", skill : 3, skillReq : 25,
   xPos : 325/4, yPos : 262/4, preReqs : [39], nextPerk: 53,
   description : "You've learned some techniques to crush armor with warhammers. (+15% armor penetration, +5% critical hit chance)"},
   //53
  {name : "Warhammer<br>Focus", skill : 3, skillReq : 25,
   xPos : 325/4, yPos : 262/4, preReqs : [52], nextPerk: 54,
   description : "You've learned some techniques to crush armor with warhammers. (+30% armor penetration, +10% critical hit chance)"},
   //54
  {name : "Warhammer<br>Focus", skill : 3, skillReq : 25,
   xPos : 325/4, yPos : 262/4, preReqs : [53], nextPerk: -1,
   description : "You've learned some techniques to crush armor with warhammers. (+45% armor penetration, +15% critical hit chance)"}, 
   //55
  {name : "Onslaught", skill : 3, skillReq : 50,
   xPos : 325/4, yPos : 212/4, preReqs : [52], nextPerk: -1,
   description : "You can deliver maximum force with your warhammer to knock off targets that fail to resist. (power attacks with warhammers knock off targets by 10% chance, 25% more damage against staggered targets.)"}, 
   //56
  {name : "Devastating<br>Charge", skill : 3, skillReq : 25,
   xPos : 160/4, yPos : 175/4, preReqs : [39], nextPerk: -1,
   description : "You've learned to perform a leaping power attack while sprinting, reducing your enemies to smithereens. (Able to do sprinting power attack which has a 50% chance to critical hit)"},
   //57
  {name : "Devastating<br>Strike", skill : 3, skillReq : 50,
   xPos : 240/4, yPos : 175/4, preReqs : [39], nextPerk: -1,
   description : "Your two-handed combat style has improved so much that all power attacks have become devastating. (25% more power attack damage, +10% critical hit chance)"},
   //58
  {name : "Hyper Armor", skill : 3, skillReq : 75,
   xPos : 200/4, yPos : 91/4, preReqs : [56, 57], nextPerk: -1,
   description : "Your power attacks are almost unstoppable. (Take 75% less poise damage while power attacking with two-handed weapons.)"},
   //59
  {name : "Mighty Strike", skill : 3, skillReq : 100,
   xPos : 200/4, yPos : 50/4, preReqs : [58], nextPerk: -1,
   description : "You can fell almost any foe with a single strike of your two-hander. (50% more poise damage)"},
   //60
  {name : "Warbringer", skill : 3, skillReq : 100,
   xPos : 200/4, yPos : 10/4, preReqs : [59], nextPerk: -1,
   description : "Your barbaric instincts strengthen as you or your foe meet their end. (Your power attacks deal up to 100% more damage based on the difference between your health and your target's health)"},
   //61
  {name : "Weapon Mastery", skill : 4, skillReq : 0,
   xPos : 200/4, yPos : 351/4, preReqs : [], nextPerk: 62,
   description : "Your improved fighting techniques allow you to swing one-handed weapons or fists with less effort and deal more damage. (20% more damage)"},
   //62
  {name : "Weapon Mastery", skill : 4, skillReq : 20,
   xPos : 200/4, yPos : 351/4, preReqs : [61], nextPerk: -1,
   description : "Your improved fighting techniques increase your damage dealt with one-handed weapons or fists greatly. (40% more damage)"},
   //63
  {name : "Penetrating Strikes", skill : 4, skillReq : 20,
   xPos : 200/4, yPos : 274/4, preReqs : [61], nextPerk: -1,
   description : "Your power attacks with one-handed weapons or fists are now devastating enough to penetrate enemy armor and less exhausting. (-30% power attack stamina cost, +30% armor penetration)"},
   //64
  {name : "Short Blade<br>Focus", skill : 4, skillReq : 25,
   xPos : 85/4, yPos : 240/4, preReqs : [63], nextPerk: 65,
   description : "You learned some dirty tricks for your dagger or tanto. (2x irresistible sneak attack damage, +20% damage from behind, +5% critical hit chance)"},
   //65
  {name : "Short Blade<br>Focus", skill : 4, skillReq : 50,
   xPos : 85/4, yPos : 240/4, preReqs : [64], nextPerk: 66,
   description : "A dagger or tanto in your hand turns into a deadly weapon. (3x irresistible sneak attack damage, +30% damage from behind, +10% critical hit chance)"},
   //66
  {name : "Short Blade<br>Focus", skill : 4, skillReq : 75,
   xPos : 85/4, yPos : 240/4, preReqs : [65], nextPerk: -1,
   description : "You have mastered the deadly art of daggers and tantos. (4x irresistible sneak attack damage, +40% damage from behind, +15% critical hit chance)"},
   //67
  {name : "Puncture", skill : 4, skillReq : 50,
   xPos : 85/4, yPos : 200/4, preReqs : [64], nextPerk: -1,
   description : "You can aim for critical weak points, dealing even more damage. (2x critical damage and +25% critical hit chance)"},
   //68
  {name : "War Axe<br>Focus", skill : 4, skillReq : 25,
   xPos : 135/4, yPos : 240/4, preReqs : [63], nextPerk: 69,
   description : "You've become familiar with war axes. (Attacks deal 20 extra damage over 20 seconds, +10% armor penetration)"},
   //69
  {name : "War Axe<br>Focus", skill : 4, skillReq : 50,
   xPos : 135/4, yPos : 240/4, preReqs : [68], nextPerk: 70,
   description : "You've become an advanced war axe fighter. (Attacks deal 30 extra damage over 20 seconds, +20% armor penetration)"},
   //70
  {name : "War Axe<br>Focus", skill : 4, skillReq : 75,
   xPos : 135/4, yPos : 240/4, preReqs : [69], nextPerk: -1,
   description : "You've become a master of war axe combat. (Attacks deal 40 extra damage over 20 seconds, +30% armor penetration)"},
   //71
  {name : "Armsbreaker", skill : 4, skillReq : 50,
   xPos : 135/4, yPos : 200/4, preReqs : [68], nextPerk: -1,
   description : "The blade of your war axe can carve into target's weapons and shields, weakening their damage and protection. (power attacks with war axes reduce target's blockable damage by 80% and stamina regeneration by 25% for 10 seconds)"},
   //72
  {name : "Mace Focus", skill : 4, skillReq : 25,
   xPos : 265/4, yPos : 240/4, preReqs : [63], nextPerk: 73,
   description : "You've learned some techniques to crush armor with maces. (10% more power attack damage, +15% armor penetration)"},
   //73
  {name : "Mace Focus", skill : 4, skillReq : 50,
   xPos : 265/4, yPos : 240/4, preReqs : [72], nextPerk: 74,
   description : "You've become an advanced mace fighter and know how to find weak spots in enemy armor. (20% more power attack damage, +30% armor penetration)"},
   //74
  {name : "Mace Focus", skill : 4, skillReq : 75,
   xPos : 265/4, yPos : 240/4, preReqs : [73], nextPerk: -1,
   description : "You've become a masterly mace fighter, rendering armor almost useless. (30% more power attack damage, +45% armor penetration)"},
   //75
  {name : "Stunning Blow", skill : 4, skillReq : 50,
   xPos : 265/4, yPos : 200/4, preReqs : [72], nextPerk: -1,
   description : "You can cause stunning impact to targets that fail to block, knocking them down to the ground. (unblocked power attacks with maces knock down targets by 10% chance, 25% more damage against staggered targets)"},
   //76
  {name : "Sword & Spear<br>Focus", skill : 4, skillReq : 25,
   xPos : 315/4, yPos : 240/4, preReqs : [63], nextPerk: 77,
   description : "You've learned the basics of using 1 handed swords, spears, javelins, rapiers and katanas. (Attacks reduce target's melee damage by 10% for 10 seconds, +10% critical hit chance)"},
   //77
  {name : "Sword & Spear<br>Focus", skill : 4, skillReq : 50,
   xPos : 315/4, yPos : 240/4, preReqs : [76], nextPerk: 78,
   description : "You've acquired the advanced techniques of using 1 handed swords and spears. (Attacks reduce target's melee damage by 15% for 10 seconds, +20% critical hit chance)"},
   //78
  {name : "Sword & Spear<br>Focus", skill : 4, skillReq : 75,
   xPos : 315/4, yPos : 240/4, preReqs : [77], nextPerk: -1,
   description : "You've become a master of using 1 handed swords and spears. (Attacks reduce target's melee damage by 20% for 10 seconds, +30% critical hit chance)"},
   //79
  {name : "Disarming Strike", skill : 4, skillReq : 50,
   xPos : 315/4, yPos : 200/4, preReqs : [76], nextPerk: -1,
   description : "Your masterful strikes allow you to disarm enemies while attacking. (power attacks with swords, spears, javelins, rapiers and katanas disarm attacking targets by 15% chance)"},
   //80
  {name : "Powerful<br>Charge", skill : 4, skillReq : 25,
   xPos : 225/4, yPos : 150/4, preReqs : [63], nextPerk: -1,
   description : "You have learned to perform a leaping power attack while sprinting. (Able to do sprinting power attack which has a 50% critical hit chance)"},  
   //81
  {name : "Powerful<br>Strike", skill : 4, skillReq : 50,
   xPos : 175/4, yPos : 150/4, preReqs : [63], nextPerk: -1,
   description : "You know how to put the maximum force into your power attacks. (20% more power attack damage, +10% critical hit chance)"},
   //82
  {name : "Relentless Onslaught", skill : 4, skillReq : 100,
   xPos : 200/4, yPos : 25/4, preReqs : [80,81], nextPerk: -1,
   description : "While attacking a target, build up momentum for a decisive strike. (Each normal attack with one-handed weapons increases power attack damage on target by 10% for 5s. Stacks up to six times - three while dual-wielding)"},
   //83
  {name : "Flurry", skill : 4, skillReq : 25,
   xPos : 350/4, yPos : 300/4, preReqs : [61], nextPerk: 84,
   description : "When fighting with dual or single one-handed weapons or fists, you are able to hit enemy weak points better. (+15% critical hit chance)"},
   //84
  {name : "Flurry", skill : 4, skillReq : 50,
   xPos : 350/4, yPos : 300/4, preReqs : [83], nextPerk: -1,
   description : "When fighting with dual or single one-handed weapons or fists, you're able to hit enemy weak points even better. (+30% critical hit chance)"},
   //85
  {name : "Storm of Steel", skill : 4, skillReq : 75,
   xPos : 335/4, yPos : 100/4, preReqs : [83], nextPerk: -1,
   description : "You've mastered the art of using multiple weapons in combat. (50% more dual-wield power attack poise damage with any weapon, unlocks secondary dagger abilities when using a bow)"},
   //86
  {name : "Hand to Hand", skill : 4, skillReq : 0,
   xPos : 125/4, yPos : 375/4, preReqs : [], nextPerk: -1,
   description : "You are trained in hand to hand combat, and can effectively disable opponents with bare hands. (+25 unarmed damage, unarmed attacks damage target stamina by half the unarmed damage)"},
   //87
  {name : "Grappling", skill : 4, skillReq : 25,
   xPos : 50/4, yPos : 365/4, preReqs : [86], nextPerk: -1,
   description : "You can grapple opponents to disarm or immobilize them. (unarmed power attacks stagger targets by 50% chance and disarm by 10% chance)"},
   //88
  {name : "Takedown", skill : 4, skillReq : 50,
   xPos : 25/4, yPos : 325/4, preReqs : [87], nextPerk: -1,
   description : "You can knock down enemies by grappling. (unarmed power attacks knock down targets by 10% chance)"},
   //89
  {name : "Unarmed Defense", skill : 4, skillReq : 25,
   xPos : 100/4, yPos : 325/4, preReqs : [86], nextPerk: -1,
   description : "You can defend yourself better even without weapons or shields. (15% less physical damage taken for each hand empty)"},
   //90
  {name : "Unarmed Stance", skill : 4, skillReq : 50,
   xPos : 50/4, yPos : 275/4, preReqs : [89], nextPerk: -1,
   description : "While unarmed, you can maneuver more freely and resist physical force. (+5% movement speed for each hand empty, +50 mass when both hands are empty)"},
   //91
  {name : "Armed Spelllcasting", skill : 4, skillReq : 50,
   xPos : 300/4, yPos : 351/4, preReqs : [61], nextPerk: -1,
   description : "You can balance your weapon well with a single hand, and can use it to cast magic. (+25% poise damage and 10% less spell cost when left hand is empty or wielding magic)"},
   //92
  {name : "Balanced Wielding", skill : 4, skillReq : 50,
   xPos : 250/4, yPos : 300/4, preReqs : [61], nextPerk: -1,
   description : "You can balance your weapon better when wielding it in a single hand, delivering quick and precise attacks. (+25% damage against enemies who are attacking and +15% armor penetration when left hand is empty)"},
   //93
  {name : "Ranged Combat Training", skill : 5, skillReq : 0,
   xPos : 250/4, yPos : 360/4, preReqs : [], nextPerk: -1,
   description : "After some training at the shooting range you can deal more damage with ranged weapons. (20% more damage, ammunition grants armor penetration)"},
   //94
  {name : "Ranger", skill : 5, skillReq : 15,
   xPos : 177/4, yPos : 322/4, preReqs : [93], nextPerk: -1,
   description : "You improved your footwork when engaging in ranged combat with light weapons. (Able to run with a drawn light bow or crossbow)"},
   //95
  {name : "Eagle Eye", skill : 5, skillReq : 25,
   xPos : 170/4, yPos : 250/4, preReqs : [93], nextPerk: -1,
   description : "By concentrating only on your target and holding your breath, you can now aim much more precisely. (Zoom in by holding right mouse button)"},
   //96
  {name : "Marksman's<br>Focus", skill : 5, skillReq : 50,
   xPos : 83/4, yPos : 161/4, preReqs : [95], nextPerk: -1,
   description : "When fully focusing on your target, everything around you seems to slow down remarkably. (Time slows down while zooming, +10% critical hit chance)"},
   //97
  {name : "Rapid Reload", skill : 5, skillReq : 50,
   xPos : 90/4, yPos : 119/4, preReqs : [95], nextPerk: -1,
   description : "Your have familiarized yourself with the mechanics of your crossbow. (+50% reload speed with heavy crossbows, +100% with light crossbows)"},
   //98
  {name : "Quick Shot", skill : 5, skillReq : 50,
   xPos : 200/4, yPos : 150/4, preReqs : [95], nextPerk: -1,
   description : "You have learned to draw and fire in one single movement. (+50% draw speed with heavy bows, +100% with light bows)"},
   //99
  {name : "Power Shot", skill : 5, skillReq : 75,
   xPos : 100/4, yPos : 78/4, preReqs : [95], nextPerk: -1,
   description : "You have discovered the art of aiming at tendons and joints. (Bows do 100% more poise damage, move forward and hold bash to perform power shot when over 200 stamina)"},
   //100
  {name : "Precise Aim", skill : 5, skillReq : 20,
   xPos : 300/4, yPos : 275/4, preReqs : [93], nextPerk: -1,
   description : "Your aim is now precise enough to target weak spots in the enemy's defenses. (20% more damage)"},
   //101
  {name : "Piercing Shot", skill : 5, skillReq : 40,
   xPos : 294/4, yPos : 175/4, preReqs : [100], nextPerk: -1,
   description : "You've learned how to hit the weakest parts of armor. (+50% armor penetration from ammunition)"},
   //102
  {name : "Penetrating Shot", skill : 5, skillReq : 80,
   xPos : 275/4, yPos : 75/4, preReqs : [101], nextPerk: -1,
   description : "You've mastered the technique of hitting weak armor parts. (+50% armor penetration from ammunition)"},
   //103
  {name : "Stunning Precision", skill : 5, skillReq : 100,
   xPos : 174/4, yPos : 27/4, preReqs : [102,99], nextPerk: -1,
   description : "Any successful staggering shot will almost always stun the target momentarily. (Staggering hits will also stun the target)"},
   //104
  {name : "Sniper", skill : 5, skillReq : 15,
   xPos : 147/4, yPos : 342/4, preReqs : [93], nextPerk: -1,
   description : "You can keep steady aim with heavy ranged weapons, dealing more damage with sneak attacks. (1.5x irresistible sneak attack damage with heavy bow or crossbow)"},
   //105
  {name : "Bow Strike", skill : 5, skillReq : 25,
   xPos : 215/4, yPos : 275/4, preReqs : [93], nextPerk: -1,
   description : "You can use your bow or crossbow as a melee weapon in close combat. (Double damage with bow bash, bow bash staggers targets, 50% less bow bash stamina cost)"},
   //106
  {name : "Knife Expertise", skill : 5, skillReq : 15,
   xPos : 255/4, yPos : 275/4, preReqs : [93], nextPerk: -1,
   description : "Throwing knives penetrate the flesh, interrupting the target. (25% chance to stagger targets with throwing knives)"},
   //107
  {name : "Hunter", skill : 5, skillReq : 0,
   xPos : 114/4, yPos : 360/4, preReqs : [], nextPerk: 108,
   description : "You are more adapted to the wildlife, and better understand its inhabitants. (Do 20% more damage to animals and take 10% less damage from animals, +10% poison and disease resistance) "},
   //108
  {name : "Hunter", skill : 5, skillReq : 0,
   xPos : 114/4, yPos : 360/4, preReqs : [107], nextPerk: -1,
   description : "You are more adapted to the wildlife, and better understand its inhabitants. (Do 40% more damage to animals and take 20% less damage from animals, +20% poison and disease resistance) "},
   //109
  {name : "Agility", skill : 6, skillReq : 0,
   xPos : 219/4, yPos : 345/4, preReqs : [], nextPerk: -1,
   description : "After some training you are now much more confident in your evasive movements. (25% less falling damage when wearing no heavy armor, unique bonus when wearing high-quality materials, -50% armor weight penalty)"},
   //110
  {name : "Dodge", skill : 6, skillReq : 25,
   xPos : 277/4, yPos : 254/4, preReqs : [109], nextPerk: -1,
   description : "Your trained reflexes allow you to dodge incoming blows. (Unlocks ability to dodge. Left alt by default.)"},
   //111
  {name : "Light Armor Training", skill : 6, skillReq : 25,
   xPos : 192/4, yPos : 240/4, preReqs : [109], nextPerk: -1,
   description : "Up to 12% more power attack and ranged weapon damage when wearing no heavy armor.  25% more armor rating when wearing a low-tier light chestpiece (fur, hide, leather, etc) and no heavy armor."},
   //112
  {name : "Dexterity", skill : 6, skillReq : 50,
   xPos : 128/4, yPos : 148/4, preReqs : [111], nextPerk: -1,
   description : "You can balance your weapon and have unlocked dynamic bow dodging. (Up to 24% less power attack cost when wearing no heavy armor, press RMB when drawing a light bow to dodge, release left click to fire)"},
   //113
  {name : "Agile Spellcasting", skill : 6, skillReq : 25,
   xPos : 115/4, yPos : 213/4, preReqs : [109], nextPerk: -1,
   description : "You learned how to avoid the limitations light armors bestow upon somatic spell components. (No spell cost penalty for casting spells in light armor)"},
   //114
  {name : "Wind Walker", skill : 6, skillReq : 75,
   xPos : 142/4, yPos : 92/4, preReqs : [112], nextPerk: -1,
   description : "Your light armor and clothes have become your second skin. (Up to +10% movement speed when wearing no heavy armor: head, chest, hands, feet, -25% armor weight penalty)"},
   //115
  {name : "Vexing Flanker", skill : 6, skillReq : 50,
   xPos : 267/4, yPos : 159/4, preReqs : [111], nextPerk: -1,
   description : "You have learned to flank your enemies with ease. (25% bonus damage when attacking from behind)"},
   //116
  {name : "Combat Reflexes", skill : 6, skillReq : 75,
   xPos : 237/4, yPos : 80/4, preReqs : [115], nextPerk: -1,
   description : "You've gained the ability to act faster in combat, though doing so will quickly exhaust you. (Lesser power: Slow time by 50% for 10 seconds, drains 15 stamina per second)"},
   //117
  {name : "Meteoric Reflexes", skill : 6, skillReq : 100,
   xPos : 195/4, yPos : 35/4, preReqs : [114,116], nextPerk: -1,
   description : "Your reflexes are lightning fast. (50% chance avoid physical damage when wearing no heavy armor: head, chest, hands, feet)"},
   //118
  {name : "Unarmored", skill : 6, skillReq : 25,
   xPos : 107/4, yPos : 294/4, preReqs : [109], nextPerk: -1,
   description : "Having no weight on your body grants you extreme precision and reflexes. (20% chance to avoid physical damage, +5% movement speed and +10% armor penetration when not wearing armor)"},
   //119
   {name : "Stealth", skill : 7, skillReq : 0,
   xPos : 189/4, yPos : 349/4, preReqs : [], nextPerk: 120,
   description : "You know the basics of moving silently and are 30% harder to detect when sneaking while not wearing any heavy armor."},
   //120
  {name : "Stealth", skill : 7, skillReq : 20,
   xPos : 189/4, yPos : 349/4, preReqs : [119], nextPerk: -1,
   description : "You are 60% harder to detect when sneaking while not wearing any heavy armor."},
   //121
  {name : "Deft Strike", skill : 7, skillReq : 25,
   xPos : 300/4, yPos : 252/4, preReqs : [119], nextPerk: -1,
   description : "You've learned to exploit weaknesses in your foes' armor when sneak attacking with daggers, bows or swords."},
   //122
  {name : "Anatomical Lore", skill : 7, skillReq : 50,
   xPos : 308/4, yPos : 174/4, preReqs : [121], nextPerk: -1,
   description : "Newfound knowledge of humanoid anatomy allows you to slay almost any human-like creature outright with sneak attacks. (5x/2x sneak attack damage with melee/ranged weapons on humanoids, 2x/1.5x on targets immune to sneak attacks)"},
   //123
  {name : "Advanced Anatomical Lore", skill : 7, skillReq : 75,
   xPos : 260/4, yPos : 134/4, preReqs : [122], nextPerk: -1,
   description : "Your vast knowledge of anatomy allows you to perform devastating sneak attacks on almost any target. (5x/2x sneak attack damage with melee/ranged weapons on all targets, 3x/2x on targets immune to sneak attacks)"},
   //124
  {name : "Muffled Movement", skill : 7, skillReq : 25,
   xPos : 100/4, yPos : 245/4, preReqs : [119], nextPerk: -1,
   description : "Your newfound finesse allows you to move more quietly while not wearing any heavy armor."},
   //125
  {name : "Light Steps", skill : 7, skillReq : 50,
   xPos : 125/4, yPos : 147/4, preReqs : [124], nextPerk: -1,
   description : "By distributing your weight more consciously, you're able to move more freely while sneaking and avoid triggering pressure plates or similar mechanisms."},
   //126
  {name : "Acrobatics", skill : 7, skillReq : 75,
   xPos : 227/4, yPos : 79/4, preReqs : [125], nextPerk: -1,
   description : "Your improved balance allows you to silently roll forward, avoid getting knocked down except through magic and move even more quietly."},
   //127
  {name : "Shadowrunner", skill : 7, skillReq : 100,
   xPos : 324/4, yPos : 45/4, preReqs : [126], nextPerk: -1,
   description : "There's almost nothing you cannot evade. You are even harder to detect, more silent and all falling damage is decreased."},
   //128
  {name : "Cheap Tricks", skill : 8, skillReq : 0,
   xPos : 175/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You have learned the basics of the art of picking locks and carrying found goods. (+3 lockpicking expertise, +25 carry weight, forge lockpicks with Craftsmanship)"},
   //129
  {name : "Advanced Lockpicking", skill : 8, skillReq : 25,
   xPos : 175/4, yPos : 275/4, preReqs : [128], nextPerk: -1,
   description : "You have extended your repertoire of lockpicking tricks and are able to carry more loot. (+2 Lockpicking Expertise, +25 carry weight)"},
   //130
  {name : "Treasure Hunter", skill : 8, skillReq : 40,
   xPos : 175/4, yPos : 200/4, preReqs : [129], nextPerk: -1,
   description : "You are able to locate secret spaces in containers when you search them. (15% chance to find special loot in select chests)"},
   //131
  {name : "Sophisticated Lockpicking", skill : 8, skillReq : 60,
   xPos : 175/4, yPos : 125/4, preReqs : [130], nextPerk: -1,
   description : "You have memorized the inner mechanics of sophisticated locks and security systems and are able to haul more loot out. (+2 Lockpicking Expertise, +25 Carry Weight)"},
   //132
  {name : "Masterly Lockpicking", skill : 8, skillReq : 90,
   xPos : 175/4, yPos : 50/4, preReqs : [131], nextPerk: -1,
   description : "You learned everything there is to know about the art of lockpicking and hauling loot. (+2 Lockpicking Expertise, +25 Carry Weight, locks never break)"},
   //133
  {name : "Leader", skill : 8, skillReq : 25,
   xPos : 100/4, yPos : 280/4, preReqs : [128], nextPerk: -1,
   description : "Nearby allies, but not the player, gain 150 armor rating and 15% magical resistance."},
   //134
  {name : "Captain", skill : 8, skillReq : 40,
   xPos : 100/4, yPos : 220/4, preReqs : [133], nextPerk: -1,
   description : "Allies, but not the player, regenerate health, stamina and magicka 50% faster."},
   //135
  {name : "Commander", skill : 8, skillReq : 60,
   xPos : 100/4, yPos : 160/4, preReqs : [134], nextPerk: -1,
   description : "Nearby allies, but not the player, gain 10% resist to fire, frost and shock."},
   //136
  {name : "Legion", skill : 8, skillReq : 100,
   xPos : 100/4, yPos : 100/4, preReqs : [135], nextPerk: -1,
   description : "Deal 10% more damage when you are fighting with allies."},
   //137
  {name : "Lone Wolf", skill : 8, skillReq : 25,
   xPos : 275/4, yPos : 280/4, preReqs : [128], nextPerk: -1,
   description : "Gain 15% magic resistance and 150 armor rating when fighting alone."},
   //138
  {name : "Solo", skill : 8, skillReq : 40,
   xPos : 275/4, yPos : 220/4, preReqs : [137], nextPerk: -1,
   description : "Regenerate health, stamina and magicka 50% faster when you are fighting alone."},
   //139
  {name : "Maverick", skill : 8, skillReq : 60,
   xPos : 275/4, yPos : 160/4, preReqs : [138], nextPerk: -1,
   description : "You resist 10% fire, frost and shock damage when fighting alone."},
   //140
  {name : "One Man Legion", skill : 8, skillReq : 100,
   xPos : 275/4, yPos : 100/4, preReqs : [139], nextPerk: -1,
   description : "Deal 10% more damage when you are fighting alone."},
   //141
  {name : "Nimble Fingers", skill : 9, skillReq : 0,
   xPos : 150/4, yPos : 350/4, preReqs : [], nextPerk: 142,
   description : "You've spent some time improving your sleight of hand, which gives you substantial chances when pickpocketing."},
   //142
  {name : "Nimble Fingers", skill : 9, skillReq : 20,
   xPos : 150/4, yPos : 350/4, preReqs : [141], nextPerk: -1,
   description : "Your fingers have become very nimble, and besides other advantages, they allow you to   pickpocket even better and to apply poisons on your victims. Why fight if a vial of deadly venom can also do the trick?"},
   //143
  {name : "Cutpurse", skill : 9, skillReq : 30,
   xPos : 50/4, yPos : 300/4, preReqs : [141], nextPerk: -1,
   description : "Pickpocketing gold, keys, gems and jewelry is 50% easier. Pickpocketing sleeping targets is much easier."},
   //144
  {name : "Poisoner", skill : 9, skillReq : 50,
   xPos : 50/4, yPos : 225/4, preReqs : [143], nextPerk: -1,
   description : "Poisons placed in targets' pockets are 50% stronger when target is not detecting you."},
   //145
  {name : "Misdirection", skill : 9, skillReq : 70,
   xPos : 50/4, yPos : 150/4, preReqs : [144], nextPerk: -1,
   description : "Can pickpocket equipped weapons, arrows and staves."},
   //146
  {name : "Perfected Art", skill : 9, skillReq : 100,
   xPos : 50/4, yPos : 75/4, preReqs : [145], nextPerk: -1,
   description : "Your legendary skill means you almost never get caught.  Poisons placed in pockets are 50% stronger on already poisoned targets."},
   //147
  {name : "Sound Body", skill : 9, skillReq : 30,
   xPos : 225/4, yPos : 250/4, preReqs : [-141,-154], nextPerk: 148,
   description : "You have unburdened your body. You gain 100 armor rating when not wearing armor and gain 10% armor penetration and 10 unarmed damage when unarmored."},
   //148
  {name : "Sound Body", skill : 9, skillReq : 30,
   xPos : 225/4, yPos : 250/4, preReqs : [147], nextPerk: -1,
   description : "You have unburdened your body. You gain 200 armor rating when not wearing armor and gain 20% armor penetration and 20 unarmed damage when unarmored."},
   //149
  {name : "Sound Mind", skill : 9, skillReq : 60,
   xPos : 225/4, yPos : 150/4, preReqs : [147], nextPerk: -1,
   description : "You've unburdened your inner thoughts, gaining 10% resistance to magic and 50% greater health, stamina and magicka regen when unarmored."},
   //150
  {name : "Sound Spirit", skill : 9, skillReq : 80,
   xPos : 225/4, yPos : 50/4, preReqs : [149], nextPerk: -1,
   description : "You have unburdened your spirit and now shouts are 10% stronger and last 10% longer also you are 25% more resistant to diseases and poisons when unarmored."},
   //151
  {name : "Outlaw", skill : 9, skillReq : 20,
   xPos : 150/4, yPos : 300/4, preReqs : [141], nextPerk: -1,
   description : "You've been in and out of jail, where most people wither away you've used the time to reflect and train Gain 5 Health, Magicka and Stamina per Jail Escapes, Up To 5 Times."},
   //152
  {name : "Thief", skill : 9, skillReq : 50,
   xPos : 150/4, yPos : 200/4, preReqs : [151], nextPerk: -1,
   description : "Gain carry weight, light armor rating and sneak ability per pocket picked, 10 carry weight, 2% light armor rating and 3% sneak ability per 20 pockets picked, maxing out at 100."},
   //153
  {name : "Lucky 7", skill : 9, skillReq : 77,
   xPos : 150/4, yPos : 100/4, preReqs : [152], nextPerk: -1,
   description : "You gain elemental resist based on how much gold you are currently carrying (Up to 21% Fire/Frost/Shock Resist, (3% per 5k gold, maxed at 35k))"},
   //154
  {name : "Trapper", skill : 9, skillReq : 0,
   xPos : 300/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You can now pickup and deploy Bear Traps, and craft them yourself at the forge. Bear Traps deal extra damage based on your Finesse skill."},
   //155
  {name : "Haggling", skill : 10, skillReq : 0,
   xPos : 200/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You've learned how to deal with Skyrim's greedy merchants Prices are better and scale 1% per speech level."},
   //156
  {name : "Merchant", skill : 10, skillReq : 50,
   xPos : 185/4, yPos : 250/4, preReqs : [155], nextPerk: -1,
   description : "You can invest gold to permanently increase the amount of gold that merchants have, merchants will buy any non-stolen item, sell price is increased by 15%."},
   //157
  {name : "Fencing", skill : 10, skillReq : 100,
   xPos : 225/4, yPos : 200/4, preReqs : [156], nextPerk: -1,
   description : "You've become so persuasive that you could make almost anyone believe that your goods are of a legal origin."},
   //158
  {name : "Silver <br> Tongue", skill : 10, skillReq : 25,
   xPos : 150/4, yPos : 350/4, preReqs : [155], nextPerk: -1,
   description : "You've spent quite some time improving your rhetorical skills, intimidation is much more likely to succeed and you gain 10% better prices from the opposite gender."},
   //159
  {name : "Leadership", skill : 10, skillReq : 75,
   xPos : 175/4, yPos : 175/4, preReqs : [158], nextPerk: -1,
   description : "Your rhetorical skill makes you the perfect leader. By inspiring all those who fight by your side, followers gain 20% damage, -15% spell cost, +75% block, +100 magicka and stamina, 50 carry weight."},
   //160
  {name : "Masquerade", skill : 10, skillReq : 50,
   xPos : 150/4, yPos : 75/4, preReqs : [158], nextPerk: 161,
   description : "You've become proficient at acting, and with the right equipment you can now disguise yourself as a Forsworn, Imperial, Stormcloak, Necromancer, Thalmor or Warlock to (usually) avoid detection."},
   //161
  {name : "Masquerade", skill : 10, skillReq : 100,
   xPos : 150/4, yPos : 75/4, preReqs : [160], nextPerk: -1,
   description : "There is no role you cannot play, and your acting is so believable that there is almost no way for others to see through your disguises."},
   //162
  {name : "War Cry", skill : 10, skillReq : 50,
   xPos : 125/4, yPos : 200/4, preReqs : [158], nextPerk: -1,
   description : "Overwhelm your enemies with a roaring shout, striking fear into their hearts and sending weakner enemies fleeing. (living enemies up to level 30 do 20% less damage, enemies up to level 20 flee from combat for one minute)"},
   //163
  {name : "Commander <br> ", skill : 10, skillReq : 25,
   xPos : 225/4, yPos : 275/4, preReqs : [155], nextPerk: 164,
   description : "Your knowledge in combat tactics allow you to effectively lead your allies in combat. (Improve nearby allies' skills by 10%, increase magicka, stamina, and their regeneration by 50(%), increase unarmed damage by 5)"},
   //164
  {name : "Commander <br> ", skill : 10, skillReq : 50,
   xPos : 225/4, yPos : 275/4, preReqs : [163], nextPerk: 165,
   description : "Your knowledge in combat tactics allow you to effectively lead your allies in combat. (Improve nearby allies' skills by 20%, increase magicka, stamina, and their regeneration by 100(%), increase unarmed damage by 10)"},
   //165
  {name : "Commander <br> ", skill : 10, skillReq : 75,
   xPos : 225/4, yPos : 275/4, preReqs : [164], nextPerk: -1,
   description : "Your knowledge in combat tactics allow you to effectively lead your allies in combat. (Improve nearby allies' skills by 30%, increase magicka, stamina, and their regeneration by 150(%), increase unarmed damage by 15)"},
   //166
  {name : "Lore of <br> the Thu'um", skill : 10, skillReq : 0,
   xPos : 350/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You've been studying the lore and ancient script of dragons and the Thu'um. Thus, you can shout cooldown is reduced by 10%."},
   //167
  {name : "Destructive <br> Urge", skill : 10, skillReq : 0,
   xPos : 300/4, yPos : 350/4, preReqs : [166], nextPerk: -1,
   description : "The horrors that the Thu'um can inflict are etched into your mind just as you have seen them etched into stone. Your shouts have 15% greater magnitude."},
   //168
  {name : "Indomitable<br>Force", skill : 10, skillReq : 0,
   xPos : 300/4, yPos : 300/4, preReqs : [166], nextPerk: -1,
   description : "You know what it means to be called Ysmir, Dragon of the North. Enemy shout effects are reduced by 50%."},
   //169
  {name : "Spiritual<br>Equilibrium", skill : 10, skillReq : 0,
   xPos : 300/4, yPos : 225/4, preReqs : [166], nextPerk: -1,
   description : "You have been guided in meditating on the Thu'um. Now your shouts linger, lasting 15% longer than they did before."},
   //170
  {name : "The Way of<br>the Voice", skill : 10, skillReq : 0,
   xPos : 325/4, yPos : 150/4, preReqs : [166], nextPerk: -1,
   description : "You've meditated thoroughly, and acquired vast insights into the Way of the Voice. Gain a daily power that lets you use your shouts more rapidly."},
   //171
  {name : "Tongue's<br>Insight", skill : 10, skillReq : 0,
   xPos : 350/4, yPos : 100/4, preReqs : [166], nextPerk: -1,
   description : "You've spent time meditating on the Way of the Voice, unearthing more knowledge. Grants a dragon soul at the cost of a perk point."},
   //172
  {name : "Shout Focus <br> ", skill : 10, skillReq : 0,
   xPos : 250/4, yPos : 325/4, preReqs : [], nextPerk: 173,
   description : "Your meditate on the Thu'um for deeper understanding of the Words of Power, making them more powerful. (Shouts are 5% more powerful, shout cooldown is reduced by 10%) "},
   //173
  {name : "Shout Focus <br> ", skill : 10, skillReq : 0,
   xPos : 250/4, yPos : 325/4, preReqs : [172], nextPerk: 174,
   description : "Your meditate on the Thu'um for deeper understanding of the Words of Power, making them more powerful. (Shouts are 10% more powerful, shout cooldown is reduced by 20%) "},
   //174
  {name : "Shout Focus <br> ", skill : 10, skillReq : 0,
   xPos : 250/4, yPos : 325/4, preReqs : [173], nextPerk: -1,
   description : "Your meditate on the Thu'um for deeper understanding of the Words of Power, making them more powerful. (Shouts are 15% more powerful, shout cooldown is reduced by 30%) "},
   //175
  {name : "Alchemical Lore", skill : 11, skillReq: 0,
   xPos : 30.7, yPos : 86.25, preReqs : [], nextPerk: 176,
   description : "You've acquired basic alchemical insights and understand how to work with a laboratory. Thus, you can now craft your own potions and poisons."},
  //176
  {name : "Alchemical Lore", skill : 11, skillReq : 20,
   xPos : 30.7, yPos : 86.25, preReqs : [175], nextPerk: -1,
   description : "Through obscure knowledge, you now can enhance your mixtures and craft alchemistic powders at a smelter. Besides, your sensory organs have become very keen. Thus, you determine all the alchemical properties of consumed ingredients."},
  //177
  {name : "Improved Elixirs", skill : 11, skillReq : 25,
   xPos : 75.7, yPos : 80.75, preReqs : [175], nextPerk: -1,
   description : "Having refinined the brewing process, your potions are now 25% stronger."},
  //178
  {name : "Night Vision", skill : 11, skillReq : 25,
  xPos : 87, yPos : 62.5, preReqs : [177], nextPerk: -1,
  description : "Having altered your body with extracts from a sabrecat eye, you can now make your eyes see in the dark at will."},
  //179
  {name : "Concentrated Poisons", skill : 11, skillReq : 25,
  xPos : 30.7, yPos : 61.5, preReqs : [175], nextPerk: -1,
  description : "Your experience in the obscure alchemical arts allows you to concentrate your poisons. Thus, you can make most of them last longer before they need to be reapplied."},
  //180
  {name : "Regeneration", skill : 11, skillReq : 50,
   xPos : 75.7, yPos : 40.5, preReqs : [177], nextPerk: -1,
   description : "Having altered your body with extracts from troll fat, slaughterfish eggs and spriggan sap, you're now able to regenerate your body, and do so even more rapidly when you are immersed in water."},
  //181
  {name : "Catalysis", skill : 11, skillReq : 50,
   xPos : 181/3, yPos : 194/4, preReqs : [177], nextPerk: 182,
   description : "You've started experimenting with a catalyst that increases the yield of the brewing process."},
  //182
  {name : "Catalysis", skill : 11, skillReq : 100,
   xPos : 181/3, yPos : 194/4, preReqs : [181], nextPerk: -1,
   description : "You've perfected the catalyst. Thereby, you can craft double the amount of mixtures with the same amount of ingredients."},
  //183
  {name : "Improved Poisons", skill : 11, skillReq : 50,
   xPos : 104/3, yPos : 156/4, preReqs : [179], nextPerk: -1,
   description : "By adding small amounts of truly horrifying ingredients, you are able to make your poisons more potent."},
  //184
  {name : "Immunization", skill : 11, skillReq : 75,
   xPos : 172/3, yPos : 98/4, preReqs : [181,183], nextPerk: -1,
   description : "You've discovered a way to make your body more resiliant to disease and poison (50% and 25% respectively)"},
  //185
  {name : "Fortified Muscles", skill : 11, skillReq : 75,
   xPos : 148/3, yPos : 225/4, preReqs : [184], nextPerk: -1,
   description : "Having altered your body with extracts from troll fat and a mammoth heart, you've become more resilient to harm."},
  //186
  {name : "Alchemical Intellect", skill : 11, skillReq : 100,
   xPos : 219/3, yPos : 45/4, preReqs : [184], nextPerk: -1,
   description : "Having altered your body with extracts from a Dremora's Heart and Ectoplasm, your mind has transcended mortal limits, expanding your magicka and improving your spell casting."},
  //187
  {name : "Purification Process", skill : 11, skillReq : 100,
   xPos : 140/3, yPos : 20/4, preReqs : [184], nextPerk: -1,
   description : "You've found a method to eliminate disadvantages from your mixtures and to make all of them even more potent."},
   //188
  {name : "Drunken Combat", skill : 11, skillReq: 0,
   xPos : 30/3, yPos : 300/4, preReqs : [], nextPerk: 189,
   description : "Alcohol pumps you up, boosting your strength and stamina. (Removes Alcohol Blur, regenerate 2 stamina per second and do 10% more damage with melee attacks while tipsy) "},
   //189
  {name : "Drunken Combat", skill : 11, skillReq: 0,
   xPos : 30/3, yPos : 300/4, preReqs : [188], nextPerk: -1,
   description : "Alcohol pumps you up, boosting your strength and stamina. (Removes Alcohol Blur, regenerate 3 stamina per second and do 20% more damage with melee attacks while drunk) "},
   //190
  {name : "Gourmet", skill : 11, skillReq: 0,
   xPos : 30/3, yPos : 250/4, preReqs : [], nextPerk: -1,
   description : "You keep a healthy diet, maximizing the nutrition of foods. (Food effects are 50% stronger and longer lasting) "},
   //191
  {name : "Herbalist", skill : 11, skillReq: 0,
   xPos : 30/3, yPos : 200/4, preReqs : [], nextPerk: 192,
   description : "You can directly consume alchemical ingredients to draw their effects. (2x magnitude for ingredients consumed) "},
   //192
  {name : "Herbalist", skill : 11, skillReq: 0,
   xPos : 30/3, yPos : 200/4, preReqs : [191], nextPerk: -1,
   description : "You can directly consume alchemical ingredients to draw their effects. (5x magnitude for ingredients consumed) "},
   //193
  {name : "Novice Illusion", skill : 12, skillReq : 0,
   xPos : 200/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You've taught yourself a few Novice level spells and learned how to cast them with decreased effort while your newfound knowledge also allows you to augment the strength and duration of all Illusion spells."},
   //194
  {name : "Apprentice<br>Illusion", skill : 12, skillReq : 25,
   xPos : 200/4, yPos : 275/4, preReqs : [193], nextPerk: -1,
   description : "By pursuing your apprenticeship in Illusion, you've gained knowledge of Apprentice level spells which you now augment while casting them with less effort."},
   //195
  {name : "Adept Illusion", skill : 12, skillReq : 50,
   xPos : 200/4, yPos : 200/4, preReqs : [194], nextPerk: -1,
   description : "By advancing further into the school of Illusion, you've gained some Adept level spells and learned how to augment and cast spells of this rank more easily."},
   //196
  {name : "Expert Illusion", skill : 12, skillReq : 75,
   xPos : 200/4, yPos : 125/4, preReqs : [195], nextPerk: -1,
   description : "You've unlocked almost every secret in the school of Illusion and you've acquired some Expert level spells. You can now cast spells of this level easier and augment them to an almost otherworldly extent."},
   //197
  {name : "Master Illusion", skill : 12, skillReq : 100,
   xPos : 200/4, yPos : 50/4, preReqs : [196], nextPerk: -1,
   description : "Your knowledge of Illusion has become all-encompassing. You taught yourself a Master level spell and you can cast the most complex spells from this school with less effort while augmenting them beyond mortal limits."},
   //198
  {name : "Perceptual Illusions", skill : 12, skillReq : 25,
   xPos : 50/4, yPos : 275/4, preReqs : [193], nextPerk: -1,
   description : "Perceptual illusion effects such as chameleon, dampen, hallucination, invisibility, muffle, night-eye, and sound are more effective and easier to cast. (1.1x magnitude, 1.1x duration, 0.9x cost for perceptual spells)"},
   //199
  {name : "Deceptive Image", skill : 12, skillReq : 50,
   xPos : 100/4, yPos : 225/4, preReqs : [198], nextPerk: -1,
   description : "You can stack illusory image on yourself to deceive your enemies, making their attacks miss and expose their weak spots. (10% chance to take no physical damage and 20% chance to ignore 50% of enemy's armor rating while perceptual illusion spells are active)"},
   //200
  {name : "Environmental<br>Manipulation", skill : 12, skillReq : 50,
   xPos : 75/4, yPos : 175/4, preReqs : [198], nextPerk: -1,
   description : "Perceptual illusion spells are improved with additional effects. (improved effect for perceptual spells)"},
   //201
  {name : "Emotional Illusions", skill : 12, skillReq : 25,
   xPos : 350/4, yPos : 275/4, preReqs : [193], nextPerk: -1,
   description : "Emotional illusion effects such as calm, charm, command, fear, frenzy, and rally are more effective and easier to cast. (increased success chance, 1.1x magnitude, 1.1x duration, 0.9x cost for emotional spells)"},
   //202
  {name : "Mesmerize", skill : 12, skillReq : 50,
   xPos : 300/4, yPos : 225/4, preReqs : [201], nextPerk: -1,
   description : "Your emotional illusion spells seep deep into the targets' mind, further reducing their chance to break free. (increased success chance and 1.2x duration for emotional illusion spells)"},
   //203
  {name : "Domination", skill : 12, skillReq : 50,
   xPos : 325/4, yPos : 175/4, preReqs : [201], nextPerk: -1,
   description : "Emotional illusion spells are improved with additional effects. (improved effect for emotional spells)"},
   //204
  {name : "Shadow Shaping", skill : 12, skillReq : 50,
   xPos : 100/4, yPos : 125/4, preReqs : [195], nextPerk: -1,
   description : "Shadow magic effects such as sanctuary, shadow drain, shadow step, shadow stride, and shadow summon are more effective and easier to cast. (1.1x magnitude, 1.1x duration, 0.9x cost for shadow spells)"},
   //205
  {name : "Shadows of Conflict", skill : 12, skillReq : 75,
   xPos : 150/4, yPos : 100/4, preReqs : [204], nextPerk: -1,
   description : "Draw power from forces in conflict, absorbing energy from nearby enemies and creating another reflection of shadow. (absorb 30% magicka regeneration from nearby enemies while shadow spells are active, +1 shadow summon limit)"},
   //206
  {name : "Master of Shadows", skill : 12, skillReq : 75,
   xPos : 125/4, yPos : 50/4, preReqs : [204], nextPerk: -1,
   description : "Shadow illusion spells are improved with additional effects. Shadow summons last longer. (improved effect for shadow spells, 1.5x duration for shadow summon spells)"},
   //207
  {name : "Delusive<br>Illusions", skill : 12, skillReq : 50,
   xPos : 300/4, yPos : 125/4, preReqs : [195], nextPerk: -1,
   description : "Delusive illusion effects such as blind, death, nightmare, noise, pain, silence, and sleep are more effective and easier to cast. (increased success chance, 1.1x magnitude, 1.1x duration, 0.9x cost for delusive spells)"},
   //208
  {name : "Curse", skill : 12, skillReq : 75,
   xPos : 250/4, yPos : 100/4, preReqs : [207], nextPerk: -1,
   description : "Curse your enemies with dark magic, weakening their body and soul. (1.1x physical damage, spell magnitude, and spell duration on targets under delusive illusion effects)"},
   //209
  {name : "Obliterate the Mind", skill : 12, skillReq : 75,
   xPos : 275/4, yPos : 50/4, preReqs : [207], nextPerk: -1,
   description : "Delusive illusion spells are improved with additional effects. (improved effect for delusive spells)"},
   //210
  {name : "Empowered Illusion", skill : 12, skillReq : 25,
   xPos : 75/4, yPos : 350/4, preReqs : [193], nextPerk: -1,
   description : "Dual casting an Illusion spell overcharges the effects into an even more powerful version."},
   //211
  {name : "Novice<br>Conjuration", skill : 13, skillReq : 0,
   xPos : 200/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You've taught yourself a few Novice level spells and learned how to cast them with decreased effort while your newfound knowledge also allows you to augment all Conjuration spells."},
  //212
  {name : "Apprentice<br>Conjuration", skill : 13, skillReq : 25,
   xPos : 325/4, yPos : 275/4, preReqs : [211], nextPerk: -1,
   description : "By pursuing your apprenticeship in Conjuration, you've gained knowledge of Apprentice level spells which you now augment while casting them with less effort."},
  //213
  {name : "Adept<br>Conjuration", skill : 13, skillReq : 50,
   xPos : 367.5/4, yPos : 200/4, preReqs : [212], nextPerk: -1,
   description : "By advancing further into the school of Conjuration, you've gained some Adept level spells and learned how to augment and cast spells of this rank more easily."},
  //214
  {name : "Expert<br>Conjuration", skill : 13, skillReq : 75,
   xPos : 365.6/4, yPos : 125/4, preReqs : [213], nextPerk: -1,
   description : "You've unlocked almost every secret in the school of Conjuration and you've acquired some Expert level spells. You can now cast spells of this level easier and augment them to an almost otherworldly extent."},
  //215
  {name : "Master<br>Conjuration", skill : 13, skillReq : 100,
   xPos : 325/4, yPos : 50/4, preReqs : [214], nextPerk: -1,
   description : "Your knowledge of Conjuration has become all-encompassing. You taught yourself a Master level spell and you can cast the most complex spells from this school with less effort while augmenting them beyond mortal limits."},
   //216
  {name : "Mystic<br>Binding", skill : 13, skillReq : 25,
   xPos : 275/4, yPos : 250/4, preReqs : [211], nextPerk: -1,
   description : "You've become skilled in binding daedra in shape of weapons and armors. Bound weapons and armors are stronger longer-lasting, and easier to cast. (stronger bound items, 1.25x bound spell duration, 0.5x bound weapon spell cost)"},
   //217
  {name : "Mystic<br>Infusion", skill : 13, skillReq : 50,
   xPos : 300/4, yPos : 200/4, preReqs : [216], nextPerk: -1,
   description : "You can infuse bound weapons and armors with additional effects of your choice. Bound weapons and armors are easier to cast. (fire/frost/shock/mystic effect for weapons (damage), shield (cloak), and armor (resist), 0.9x bound item spell cost)"},
   //218
  {name : "Mystic<br>Empowerment", skill : 13, skillReq : 75,
   xPos : 287.5/4, yPos : 150/4, preReqs : [217], nextPerk: -1,
   description : "You can bind stronger or additional effects to your bound weapons and armors. Bound weapons and armors are more easier to cast and last longer. (improved bound effects, 1.5x bound spell duration (overwrite), 0.8x bound item spell cost (overwrite))"},
   //219
  {name : "Mystic<br>Disruption", skill : 13, skillReq : 100,
   xPos : 267.5/4, yPos : 75/4, preReqs : [218], nextPerk: -1,
   description : "You've perfected your invocations of summoning bound weapons and armors. Your bound weapons and armors are much stronger. (stronger bound items, weapon/shield/armor get increased armor penetration (20%) / damage blocked (20%) / physical damage reduction (10%))"},
   //220
  {name : "Necromancy", skill : 13, skillReq : 25,
   xPos : 175/4, yPos : 225/4, preReqs : [211], nextPerk: -1,
   description : "You've developed your skill for summoning undead and rasing the dead, improving their potency and duration. (2x undead summon spell duration, stronger reanimated dead, 1.25x reanimate level limit, 5x reanimate spell duration)"},
   //221
  {name : "Ritualism", skill : 13, skillReq : 50,
   xPos : 175/4, yPos : 175/4, preReqs : [220], nextPerk: -1,
   description : "Your knowledge of the realms of the dead surpasses that of many. You can raise stronger entities and they last much longer. (3x undead summon spell duration (overwrite), 1.5x reanimate level limit (overwrite), 10x reanimate spell duration (overwrite))"},
   //222
  {name : "Siphon Corpse", skill : 13, skillReq : 50,
   xPos : 187.5/4, yPos : 112.5/4, preReqs : [221], nextPerk: -1,
   description : "You can violently drain remaining energy from corpses, destoying them in the process to damage nearby enemies. (Siphon Corpse lesser power: absorb 50 magicka from each corpse and deal 50 magical damage to nearby enemies, half damage to non-living)"},
   //223
  {name : "Dark<br>Infusion", skill : 13, skillReq : 75,
   xPos : 150/4, yPos : 75/4, preReqs : [221], nextPerk: -1,
   description : "By infusing your undead creations with dark energies, you can make them stronger and prevent them from decaying to dust. (stronger reanimated dead, reanimated dead can cast spells, reanimated dead do not turn into ash, 1.5x undead summon spell duration)"},
   //224
  {name : "Empowered<br>Conjuration", skill : 13, skillReq : 25,
   xPos : 112.5/4, yPos : 225/4, preReqs : [211], nextPerk: -1,
   description : "Dual casting a Conjuration spell overcharges the spell, allowing it to last longer."},
   //225
  {name : "Cognitive<br>Flexibility", skill : 13, skillReq : 50,
   xPos : 125/4, yPos : 125/4, preReqs : [224], nextPerk: 226,
   description : "You have practiced the mental ability of maintaining two summons at the same time. This power extends to controlling any type of conjured or conceived entity, even outside the school of Conjuration."},
  //226
  {name : "Cognitive<br>Flexibility", skill : 13, skillReq : 100,
   xPos : 125/4, yPos : 125/4, preReqs : [225], nextPerk: -1,
   description : "You have mastered the art of Cognitive Flexibility, a trait of only the most accomplished Summoners throughout history. You can now control three summons, of any type, simultaneously."},
   //227
  {name : "Daedric Binding", skill : 13, skillReq : 25,
   xPos : 75/4, yPos : 275/4, preReqs : [211], nextPerk: -1,
   description : "Having studied the barriers that divide the planes of existence, you can make your summoned daedra last longer in this realm. (2x daedra summon spell duration)"},
  //228
  {name : "Spiritual<br>Binding", skill : 13, skillReq : 35,
   xPos : 50/4, yPos : 200/4, preReqs : [227], nextPerk: -1,
   description : "Your knowledge of Oblivion's spiritual aspects increases the strength of all your summoned spirits."},
   //229
  {name : "Gates of Oblivion", skill : 13, skillReq : 50,
   xPos : 50/4, yPos : 150/4, preReqs : [228], nextPerk: -1,
   description : "You've perfected your spells' formulae to summon the daedra, maintaining them longer and can cast them further away. (3x daedra summon spell duration (overwrite), 3x daedra summon spell range)"},
   //230
  {name : "Dark Channeling", skill : 13, skillReq : 50,
   xPos : 87.5/4, yPos : 87.5/4, preReqs : [229], nextPerk: -1,
   description : "You draw dark energy from the Oblivion realm while maintaining a connection to it, boosting your magicka regeneration. (+150% magicka regeneration while daedra summons are active)"},
   //231
  {name : "Waters of Oblivion", skill : 13, skillReq : 75,
   xPos : 50/4, yPos : 50/4, preReqs : [229], nextPerk: -1,
   description : "Your knowledge of Oblivion's elemental aspects increases the strength of all your summoned Atronachs. Other daedra summons last longer. (stronger atronach summons, 1.5x non-atronach daedra summon spell duration)"},
   //232
  {name : "Spirit Calling", skill : 13, skillReq : 25,
   xPos : 225/4, yPos : 275/4, preReqs : [211], nextPerk: -1,
   description : "You've learned to commune with the spirits, summoning them for extended duration. (2x spirit summon spell duration)"},
   //233
  {name : "Spiritual Bond", skill : 13, skillReq : 50,
   xPos : 225/4, yPos : 200/4, preReqs : [232], nextPerk: -1,
   description : "You've strengthened your bond with the spirits. They can be summoned with much more ease and will last longer. (3x spirit summon spell duration (overwrite), 0.9x spirit summon spell cost)"},
   //234
  {name : "Spirit Guardian", skill : 13, skillReq : 50,
   xPos : 237.5/4, yPos : 125/4, preReqs : [233], nextPerk: -1,
   description : "You can call upon the spirits to protect you, increasing your resistance to physical and magical attacks. (+10% magic resistance and +150 armor rating while spirit summons are active)"},
   //235
  {name : "Ancient Spirits", skill : 13, skillReq : 75,
   xPos : 212.5/4, yPos : 75/4, preReqs : [233], nextPerk: -1,
   description : "You can call upon the ancient spirits for your aid. Summoned spirits are faster and stronger. (stronger spirit summons)"},
   //236
  {name : "Soul Magic", skill : 13, skillReq : 50,
   xPos : 325/4, yPos : 150/4, preReqs : [213], nextPerk: -1,
   description : "Your training on Soul Magic allows you to channel more strength with higher efficiency. (1.1x magnitude, 1.1x duration, 0.9x cost for necrotic and soul spells)"},
   //237
  {name : "Necropotence", skill : 13, skillReq : 75,
   xPos : 300/4, yPos : 100/4, preReqs : [236], nextPerk: -1,
   description : "Your necrotic spell consumes all, burning the soul of the living and damaging even the non-living. (25% stagger chance when dual-casted, extra damage over time to the living, half damage to non-living)"},
   //238
  {name : "Novice Destruction", skill : 14, skillReq : 0,
   xPos : 200/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You've taught yourself a few Novice level spells and learned how to cast them with decreased effort while your newfound knowledge also allows you to augment all Destruction spells."},
   //239
  {name : "Apprentice<br>Destruction", skill : 14, skillReq : 25,
   xPos : 250/4, yPos : 275/4, preReqs : [238], nextPerk: -1,
   description : "By pursuing your apprenticeship in Destruction, you've gained knowledge of Apprentice level spells which you now augment while casting them with less effort."},
   //240
  {name : "Adept<br>Destruction", skill : 14, skillReq : 50,
   xPos : 225/4, yPos : 200/4, preReqs : [239], nextPerk: -1,
   description : "By advancing further into the school of Destruction, you've gained some Adept level spells and learned how to augment and cast spells of this rank more easily."},
   //241
  {name : "Expert<br>Destruction", skill : 14, skillReq : 75,
   xPos : 250/4, yPos : 125/4, preReqs : [240], nextPerk: -1,
   description : "You've unlocked almost every secret in the school of Destruction and you've acquired some Expert level spells. You can now cast spells of this level easier and augment them to an almost otherworldly extent."},
   //242
  {name : "Master<br>Destruction", skill : 14, skillReq : 100,
   xPos : 275/4, yPos : 50/4, preReqs : [241], nextPerk: -1,
   description : "Your knowledge of Destruction has become all-encompassing. You taught yourself a Master level spell and you can cast the most complex spells from this school with less effort while augmenting them beyond mortal limits."},
   //243
  {name : "Improved Cloaks", skill : 14, skillReq : 75,
   xPos : 350/4, yPos : 225/4, preReqs : [239], nextPerk: -1,
   description : "You can radiate more energy with cloak spells, increasing their damage greatly. (1.5x cloak spell damage)"},
   //244
  {name : "Elemental Mastery", skill : 14, skillReq : 50,
   xPos : 325/4, yPos : 175/4, preReqs : [239], nextPerk: -1,
   description : "Unlock the power of elemental seals. Cast Fire, Frost, and Lightning Seals at your feet, each creating a deadly trap that triggers when enemies approach. All three seals can be active simultaneously."},
   //245
  {name : "Destructive Blow", skill : 14, skillReq : 50,
   xPos : 260/4, yPos : 187.5/4, preReqs : [239], nextPerk: -1,
   description : "You can deliver powerful force with touch and nova spells, causing more damage and staggering targets. (1.25x magnitude for touch and nova spells, 25% chance to stagger for damaging touch and nova spells)"},
   //246
  {name : "Empowered<br>Destruction", skill : 14, skillReq : 25,
   xPos : 300/4, yPos : 325/4, preReqs : [238], nextPerk: -1,
   description : "Dual casting a Destruction spell overcharges the effects into an even more powerful version."},
   //247
  {name : "Impact", skill : 14, skillReq : 50,
   xPos : 350/4, yPos : 275/4, preReqs : [246], nextPerk: -1,
   description : "By intensifying the force of most of your overcharged Destruction spells, you're now capable of staggering your foes. (25% chance to stagger when dual-casted)"},
   //248
  {name : "Blood Magic", skill : 14, skillReq : 25,
   xPos : 37.5/4, yPos : 300/4, preReqs : [238], nextPerk: 249,
   description : "You can more efficiently absorb energy from targets. Absorb spells are more powerful and costs less magicka. (1.1x magnitude, 0.9x cost for absorb spells)"},
   //249
  {name : "Blood Magic", skill : 14, skillReq : 50,
   xPos : 37.5/4, yPos : 300/4, preReqs : [248], nextPerk: -1,
   description : "You can absorb even more energy from targets with greater efficiency. (1.2x magnitude, 0.8x cost for absorb spells)"},
   //250
  {name : "Consume Life", skill : 14, skillReq : 75,
   xPos : 25/4, yPos : 200/4, preReqs : [248], nextPerk: -1,
   description : "You can absorb much more health from living targets. (1.25x magnitude for absorb health spells on living targets)"},
   //251
  {name : "Entropic Focus", skill : 14, skillReq : 25,
   xPos : 87.5/4, yPos : 275/4, preReqs : [238], nextPerk: 252,
   description : "You now are able to improve your Entropic spells and thereby increase their effectiveness. (1.1x magnitude, 0.9x cost for entropic spells)"},
   //252
  {name : "Entropic Focus", skill : 14, skillReq : 50,
   xPos : 87.5/4, yPos : 275/4, preReqs : [251], nextPerk: -1,
   description : "Your Entropic spells are more powerful and you can cast them more efficiently. (1.2x magnitude, 0.8x cost for entropic spells)"},
   //253
  {name : "Entropic Disarray", skill : 14, skillReq : 75,
   xPos : 67.5/4, yPos : 167.5/4, preReqs : [251], nextPerk: -1,
   description : "Your Entropic spells drain all energy from targets, damaging Magicka and Stamina by same amount. (magicka and stamina damage for entropic spells)"},
   //254
  {name : "Arcane Focus", skill : 14, skillReq : 25,
   xPos : 125/4, yPos : 250/4, preReqs : [238], nextPerk: 255,
   description : "You now are able to improve your Arcane spells and thereby increase their effectiveness. (1.1x magnitude, 0.9x cost for arcane spells)"},
   //255
  {name : "Arcane Focus", skill : 14, skillReq : 50,
   xPos : 125/4, yPos : 250/4, preReqs : [254], nextPerk: -1,
   description : "Your Arcane spells are more powerful and you can cast them more efficiently. (1.2x magnitude, 0.8x cost for arcane spells)"},
   //256
  {name : "Arcane Disruption", skill : 14, skillReq : 75,
   xPos : 87.5/4, yPos : 125/4, preReqs : [254], nextPerk: -1,
   description : "You can imbue more magical energy to arcane spells, dealing more damage to enemies that are not resistant to magic. (arcane spells do more damage to enemies with low magic resistance)"},
   //257
  {name : "Pyromancy", skill : 14, skillReq : 25,
   xPos : 150/4, yPos : 187.5/4, preReqs : [238], nextPerk: 258,
   description : "You now are able to intensify the heat of your fire spells. Thus, they now deal increased damage. (1.1x magnitude, 0.9x cost for fire spells)"},
   //258
  {name : "Pyromancy", skill : 14, skillReq : 50,
   xPos : 150/4, yPos : 187.5/4, preReqs : [257], nextPerk: -1,
   description : "Your fire spells burn with almost otherworldly heat and consume earth and flesh with terrifying ease. (1.2x magnitude, 0.8x cost for fire spells)"},
   //259
  {name : "Cremation", skill : 14, skillReq : 75,
   xPos : 137.5/4, yPos : 137.5/4, preReqs : [257], nextPerk: -1,
   description : "Enemies are set on fire for extended duration, taking extra damage over time. (extra damage over time for fire spells)"},
   //260
  {name : "Fire<br>Mastery", skill : 14, skillReq : 100,
   xPos : 125/4, yPos : 50/4, preReqs : [259], nextPerk: -1,
   description : "Your mastery of fire element grants you resistance to fire and increased efficiency of fire spells. (+25% fire resistance, 1.05x magnitude, 0.9x cost for fire spells)"},
   //261
  {name : "Cyromancy", skill : 14, skillReq : 25,
   xPos : 175/4, yPos : 225/4, preReqs : [238], nextPerk: 262,
   description : "You now are able to improve your ice spells and thereby increase their effectiveness. (1.1x magnitude, 0.9x cost for frost spells)"},
   //262
  {name : "Cyromancy", skill : 14, skillReq : 50,
   xPos : 175/4, yPos : 225/4, preReqs : [261], nextPerk: -1,
   description : "Your ice spells freeze even air in a trice and make the harsh winters of Skyrim look like a refreshing breeze. (1.2x magnitude, 0.8x cost for frost spells)"},
   //263
  {name : "Deep Freeze", skill : 14, skillReq : 75,
   xPos : 175/4, yPos : 112.5/4, preReqs : [261], nextPerk: -1,
   description : "Your frost spells render targets more susceptible to frost, and freezes enemies with low resistance to frost or magic. (freeze effect for frost spells, frost spells temporarily reduce target's frost resistance by 10% if not immune)"},
  //264
  {name : "Frost<br>Mastery", skill : 14, skillReq : 100,
   xPos : 175/4, yPos : 50/4, preReqs : [263], nextPerk: -1,
   description : "Your mastery of frost element grants you resistance to frost and increased efficiency of frost spells. (+25% frost resistance, 1.05x magnitude, 0.9x cost for frost spells)"},
   //265
  {name : "Electromancy", skill : 14, skillReq : 25,
   xPos : 200/4, yPos : 275/4, preReqs : [238], nextPerk: 266,
   description : "You can now energize your lightning spells more effectively, causing them to deal more damage. (1.1x magnitude, 0.9x cost for shock spells)"},
   //266
  {name : "Electromancy", skill : 14, skillReq : 50,
   xPos : 200/4, yPos : 275/4, preReqs : [265], nextPerk: -1,
   description : "Compared to your lightning spells, the worst tempests would look like a mild summer breeze. (1.2x magnitude, 0.8x cost for shock spells)"},
   //267
  {name : "Electrostatic<br>Discharge", skill : 14, skillReq : 75,
   xPos : 200/4, yPos : 150/4, preReqs : [265], nextPerk: -1,
   description : "Lightning spells deplete targets' magicka and staggers enemies with low resistance to shock or magic. (Magicka damage and stagger for shock spells)"},
   //268
  {name : "Lightning<br>Mastery", skill : 14, skillReq : 100,
   xPos : 225/4, yPos : 50/4, preReqs : [267], nextPerk: -1,
   description : "Your mastery of lightning element grants you resistance to shock and increased efficiency of lightning spells. (+25% shock resistance, 1.05x magnitude, 0.9x cost for shock spells)"},
   //269
  {name : "Painful Regrets", skill : 15, skillReq : 0,
   xPos : 325/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You've honestly reflected your sins, and you truly regret what pain you have inflicted upon others. All spells cost 10% less but buying/selling prices are much higher."},
   //270
  {name : "Novice Restoration", skill : 15, skillReq : 0,
   xPos : 200/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You've taught yourself a few Novice level spells and learned how to cast them with decreased effort while your newfound knowledge also allows you to augment all Restoration spells."},
   //271
  {name : "Apprentice<br>Restoration", skill : 15, skillReq : 25,
   xPos : 225/4, yPos : 275/4, preReqs : [270], nextPerk: -1,
   description : "By pursuing your apprenticeship in Restoration, you've gained knowledge of Apprentice level spells which you now augment while casting them with less effort."},
   //272
  {name : "Adept<br>Restoration", skill : 15, skillReq : 50,
   xPos : 225/4, yPos : 200/4, preReqs : [271], nextPerk: -1,
   description : "By advancing further into the school of Restoration, you've gained some Adept level spells and learned how to augment and cast spells of this rank more easily."},
   //273
  {name : "Expert<br>Restoration", skill : 15, skillReq : 75,
   xPos : 225/4, yPos : 125/4, preReqs : [272], nextPerk: -1,
   description : "You've unlocked almost every secret in the school of Restoration and you've acquired some Expert level spells. You can now cast spells of this level easier and augment them to an almost otherworldly extent."},
   //274
  {name : "Master Restoration", skill : 15, skillReq : 100,
   xPos : 175/4, yPos : 50/4, preReqs : [273], nextPerk: -1,
   description : "Your knowledge of Restoration has become all-encompassing.You taught yourself a Master level spell and you can cast the most complex spells from this school with less effort while augmenting them beyond mortal limits."},
   //275
  {name : "Empowered Restoration", skill : 15, skillReq : 25,
   xPos : 337.5/4, yPos : 312.5/4, preReqs : [270], nextPerk: -1,
   description : "Dual casting a Restoration spell overcharges the effects into an even more powerful version."},
   //276
  {name : "Focused Mind", skill : 15, skillReq : 25,
   xPos : 262.5/4, yPos : 182.5/4, preReqs : [271], nextPerk: -1,
   description : "You've learned to focus your mind. Thus, you can keep your concentration even in stressful situations and regenerate your magicka faster. (+50% magicka regeneration)"},
   //277
  {name : "Power of Life", skill : 15, skillReq : 50,
   xPos : 262.5/4, yPos : 100/4, preReqs : [276], nextPerk: -1,
   description : "Your studies of healing magic now grant you the power of making yourself almost invulnerable for a short duration once a day."},
   //278
  {name : "Essence of Life", skill : 15, skillReq : 75,
   xPos : 300/4, yPos : 75/4, preReqs : [277], nextPerk: -1,
   description : "Your understanding of healing and how magic and life are intertwined allows you to call upon your newfound power more often."},
   //279
  {name : "Improved<br>Protection", skill : 15, skillReq : 25,
   xPos : 300/4, yPos : 225/4, preReqs : [270], nextPerk: -1,
   description : "Ward, Fortify, and Resist spells are stonger and more efficient. (1.1x magnitude, 1.1x duration, 0.9x cost for protection spells)"},
   //280
  {name : "Improved<br>Wards", skill : 15, skillReq : 75,
   xPos : 325/4, yPos : 150/4, preReqs : [279], nextPerk: -1,
   description : "Your arcane wards now absorb magicka from incoming spells and have improved efficiency. (25% ward spell absorption, 0.9x ward spell cost)"},
   //281
  {name : "Ward Mastery", skill : 15, skillReq : 50,
   xPos : 300/4, yPos : 275/4, preReqs : [270], nextPerk: -1,
   description : "You are more proficient with ward spells, using them more efficiently to block magic. (Ward spells cost 50% less magicka, +10% magic resistance when holding Ward spell in hand)"},
   //282
  {name : "Improved Healing", skill : 15, skillReq : 25,
   xPos : 40/4, yPos : 275/4, preReqs : [270], nextPerk: -1,
   description : "You've gained more knowledge about healing spells, allowing you to heal wounds more efficiently. (1.1x magnitude, 0.9x cost for healing and cure spells)"},
   //283
  {name : "Respite", skill : 15, skillReq : 75,
   xPos : 30/4, yPos : 175/4, preReqs : [282], nextPerk: -1,
   description : "In addition to curing wounds, your healing spells now reinvigorate the body itself, restoring subject's stamina. (healing spells restore stamina by 0.5x of healing done)"},
   //284
  {name : "Improved Turning", skill : 15, skillReq : 25,
   xPos : 80/4, yPos : 250/4, preReqs : [270], nextPerk: -1,
   description : "Turn, Purify, and Abjuration spells are stonger and more efficient. (1.1x magnitude, 1.1x duration, 0.9x cost for turn spells)"},
   //285
  {name : "Mystic Turning", skill : 15, skillReq : 75,
   xPos : 70/4, yPos : 150/4, preReqs : [284], nextPerk: -1,
   description : "You've learned the art of weaving mystical energies into your spells, making all of them more effective against the undead and Daedra. (1.1x spell magnitude, 1.2x spell duration on undead and daedra)"},
   //286
  {name : "Heliomancy", skill : 15, skillReq : 25,
   xPos : 120/4, yPos : 225/4, preReqs : [270], nextPerk: -1,
   description : "You now are able to improve your sun spells and thereby increase their effectiveness. (1.1x magnitude, 0.9x cost for sun spells)"},
   //287
  {name : "Scorching Light", skill : 15, skillReq : 75,
   xPos : 110/4, yPos : 125/4, preReqs : [286], nextPerk: -1,
   description : "Your sun spells are infused with radiant energy, dealing more damage to undead and even damage the living. (25% stagger chance when dual-casted, extra damage over time to undead, sun spells that only work on undead now deal half damage to living)"},
   //288
  {name : "Venomancy", skill : 15, skillReq : 25,
   xPos : 160/4, yPos : 200/4, preReqs : [270], nextPerk: -1,
   description : "You now are able to improve your poison spells and thereby increase their effectiveness. (1.1x magnitude, 0.9x cost for poison spells)"},
   //289
  {name : "Paralyzing Poison", skill : 15, skillReq : 75,
   xPos : 150/4, yPos : 100/4, preReqs : [288], nextPerk: -1,
   description : "Your poison spells are much more potent, rendering targets more susceptible to poison and paralyzing those with low resistance to poison or magic. (paralysis effect for poison spells, poison spells temporarily reduce target's poison resistance by 10% if not immune)"},
   //290
  {name : "Novice Alteration", skill : 16, skillReq : 0,
   xPos : 137.5/3, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You've taught yourself a few Novice level spells and learned how to cast them with decreased effort while your newfound knowledge also allows you to augment all Alteration spells."},
  //291
  {name : "Apprentice Alteration", skill : 16, skillReq : 25,
   xPos : 175/3, yPos : 275/4, preReqs : [290], nextPerk: -1,
   description : "By pursuing your apprenticeship in Alteration, you've gained knowledge of Apprentice level spells which you now augment while casting them with less effort."},
   //292
  {name : "Adept Alteration", skill : 16, skillReq : 50,
   xPos : 150/3, yPos : 200/4, preReqs : [291], nextPerk: -1,
   description : "By advancing further into the school of Alteration, you've gained some Adept level spells and learned how to augment and cast spells of this rank more easily."},
   //293
  {name : "Expert Alteration", skill : 16, skillReq : 75,
   xPos : 175/3, yPos : 125/4, preReqs : [292], nextPerk: -1,
   description : "You've unlocked almost every secret in the school of Alteration and you've acquired some Expert level spells. You can now cast spells of this level easier and augment them to an almost otherworldly extent."},
   //294
  {name : "Master Alteration", skill : 16, skillReq : 100,
   xPos : 200/3, yPos : 50/4, preReqs : [293], nextPerk: -1,
   description : "Your knowledge of Alteration has become all-encompassing. You taught yourself a Master level spell and you can cast the most complex spells from this school with less effort while augmenting them beyond mortal limits."},
   //295
  {name : "Transmutation", skill : 16, skillReq : 25,
   xPos : 225/3, yPos : 300/4, preReqs : [290], nextPerk: -1,
   description : "Transmutation, size-shifting, shape-shifting spells are stonger and more efficient. (1.1x magnitude, 1.1x duration, 0.9x cost for transmutation spells)"},
   //296
  {name : "Transmutational Mending", skill : 16, skillReq : 75,
   xPos : 250/3, yPos : 250/4, preReqs : [295], nextPerk: -1,
   description : "Health is increased and regenerates while transmutation spell is active. (+50 health and +1/s health regeneration while transmutation spell is active)"},
   //297
  {name : "Empowered Alterations", skill : 16, skillReq : 25,
   xPos : 100/3, yPos : 275/4, preReqs : [290], nextPerk: -1,
   description : "Dual casting an Alteration spell overcharges the effects into an even more powerful version."},
   //298
  {name : "Kinetomancy", skill : 16, skillReq : 25,
   xPos : 200/3, yPos : 225/4, preReqs : [291], nextPerk: -1,
   description : "You can more easily handle telekinetic spells, increasing their power and efficiency. (1.2x magnitude, 0.8x cost for telekinetic spells)"},
   //299
  {name : "Power of the Force", skill : 16, skillReq : 75,
   xPos : 250/3, yPos : 175/4, preReqs : [298], nextPerk: -1,
   description : "Your telekinetic spells cause devastating impact, dealing more damage and knocking off stronger targets. (+25% physical telekinetic spell damage, +10% magic resistance threshold for telekinetic knockdown effect)"},
   //300
  {name : "Improved Mage Armor", skill : 16, skillReq : 25,
   xPos : 100/3, yPos : 225/4, preReqs : [291], nextPerk: -1,
   description : "You've mastered the art of casting armor spells. Their effect is maximized when you don't wear any distracting armor. (1.5x armor and shield spell magnitude when not wearing chest armor, 1.2x when wearing chest armor)"},
   //301
  {name : "Versatile Armor", skill : 16, skillReq : 50,
   xPos : 75/3, yPos : 175/4, preReqs : [300], nextPerk: -1,
   description : "You've expanded the versatility of your Armor and Shield spells, enabling them to decrease incoming elemental and physical damage. (0.8x incoming fire, frost, shock, physical damage when Armor or Shield spell is active)"},
   //302
  {name : "Magic<br>Resistance", skill : 16, skillReq : 25,
   xPos : 200/3, yPos : 150/4, preReqs : [291], nextPerk: 303,
   description : "You're able to block a part of a dangerous spell's effect. (+10% magic resistance)"},
   //303
  {name : "Magic<br>Resistance", skill : 16, skillReq : 50,
   xPos : 200/3, yPos : 150/4, preReqs : [302], nextPerk: 304,
   description : "You are able to block more of a dangerous spell's effect. (+20% magic resistance)"},
   //304
  {name : "Magic<br>Resistance", skill : 16, skillReq : 75,
   xPos : 200/3, yPos : 150/4, preReqs : [303], nextPerk: -1,
   description : "You are able to block even more of a dangerous spell's effect. (+30% magic resistance)"},
   //305
  {name : "Stability", skill : 16, skillReq : 50,
   xPos : 125/3, yPos : 150/4, preReqs : [292], nextPerk: -1,
   description : "You've become exceptionally good at making your alteration spells more stable. Thus, they now last longer. (1.5x alteration spell duration)"},
   //306
  {name : "Metamagical<br>Thesis", skill : 16, skillReq : 75,
   xPos : 87.5/3, yPos : 112.5/4, preReqs : [305], nextPerk: -1,
   description : "Your knowledge of the very fabric of magic itself allows you to cast any spell of any school with decreased effort. (0.9x spell cost for all schools of magic)"},
   //307
  {name : "Metamagical<br>Empowerment", skill : 16, skillReq : 100,
   xPos : 50/3, yPos : 50/4, preReqs : [306], nextPerk: -1,
   description : "Having delved even deeper in metamagical lore, you can cast any spell more effectively and augment all other magical effects. (1.1x magnitude, 1.1x duration for all schools of magic)"},
   //308
  {name : "Weather Magic", skill : 16, skillReq : 50,
   xPos : 137.5/3, yPos : 100/4, preReqs : [292], nextPerk: -1,
   description : "Wind spells are stronger and more efficient. (1.2x magnitude, 1.2x duration, 0.8x cost for wind spells)"},
   //309
  {name : "Master of<br>Storms", skill : 16, skillReq : 75,
   xPos : 100/3, yPos : 50/4, preReqs : [308], nextPerk: -1,
   description : "Wind spells are more devastating at exteriors, and you can summon a thunderstorm with Control Weather spell. (1.33x wind spell magnitude at exteriors, can choose Storm weather with Control Weather spell)"},
   //310
  {name : "Magical<br>Absorption", skill : 16, skillReq : 100,
   xPos : 150/3, yPos : 50/4, preReqs : [293], nextPerk: -1,
   description : "You've mastered the art of absorbing Magicka from incoming spells, and are now able to fully absorb their power from time to time. (+10% magic absorb chance)"},
   //311
  {name : "Unskilled Spellcasting", skill : 16, skillReq : 0,
   xPos : 50/3, yPos : 350/4, preReqs : [], nextPerk: 312,
   description : "You can cast simple spells without mastering them but with less potency. (Spells up to Novice level cost 50% less magicka to cast without mastery perks)"},
   //312
  {name : "Unskilled Spellcasting", skill : 16, skillReq : 0,
   xPos : 50/3, yPos : 350/4, preReqs : [311], nextPerk: 313,
   description : "You can cast simple spells without mastering them but with less potency. (Spells up to Apprentice level cost 50% less magicka to cast without mastery perks, +0.5% spell power for each skill level) "},
   //313
  {name : "Unskilled Spellcasting", skill : 16, skillReq : 0,
   xPos : 50/3, yPos : 350/4, preReqs : [312], nextPerk: -1,
   description : "You can cast simple spells without mastering them but with less potency. (Spells up to Adept level cost 50% less magicka to cast without mastery perks, +1% spell power for each skill level) "},
   //314
  {name : "Metamagic", skill : 16, skillReq : 0,
   xPos : 200/3, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "You can empower your spells in cost of more Magicka to cast them. (Apply one of the three bonuses with 50% more magicka cost: 20% higher magnitude, 20% longer duration, 3x longer spell range) "},
   //315
  {name : "Willpower", skill : 16, skillReq : 0,
   xPos : 250/3, yPos : 350/4, preReqs : [], nextPerk: 316,
   description : "Your strong willpower provides resistance to harmful magic and more stamina. (+5% magic resistance when Magic Resistance perk is not taken, +10 stamina) "},
   //316
  {name : "Willpower", skill : 16, skillReq : 0,
   xPos : 250/3, yPos : 350/4, preReqs : [315], nextPerk: 317,
   description : "Your strong willpower provides resistance to harmful magic and more stamina. (+10% magic resistance when Magic Resistance perk is not taken, +20 stamina) "},
   //317
  {name : "Willpower", skill : 16, skillReq : 0,
   xPos : 250/3, yPos : 350/4, preReqs : [316], nextPerk: -1,
   description : "Your strong willpower provides resistance to harmful magic and more stamina. (+15% magic resistance when Magic Resistance perk is not taken, +30 stamina) "},
   //318
  {name : "Enchanter's Insight", skill : 17, skillReq : 0,
   xPos : 183/4, yPos : 342/4, preReqs : [], nextPerk: 319,
   description : "You've acquired fundamental insights into how matter and magic intertwine. (new enchantments are 25% stronger, craft novice level staves and scrolls, can recharge weapons)"},
   //319
  {name : "Enchanter's Insight", skill : 17, skillReq : 20,
   xPos : 183/4, yPos : 342/4, preReqs : [318], nextPerk: -1,
   description : "Your advanced knowledge of arcane energy allows you to improve all your enchantments even more. (new enchantments are 50% stronger, craft novice level staves and scrolls)"},
   //320
  {name : "Arcane Artificery", skill : 17, skillReq : 20,
   xPos : 300/4, yPos : 275/4, preReqs : [318], nextPerk: 321,
   description : "Your understanding of enchantments allow you to use them more effectively and efficiently. (Staves and Scrolls are 10% more powerful, enchantments cost 10% less charges)"},
   //321
  {name : "Arcane Artificery", skill : 17, skillReq : 45,
   xPos : 300/4, yPos : 275/4, preReqs : [320], nextPerk: 322,
   description : "Your understanding of enchantments allow you to use them more effectively and efficiently. (Staves and Scrolls are 20% more powerful, enchantments cost 20% less charges)"},
   //322
  {name : "Arcane Artificery", skill : 17, skillReq : 70,
   xPos : 300/4, yPos : 275/4, preReqs : [321], nextPerk: -1,
   description : "Your understanding of enchantments allow you to use them more effectively and efficiently. (Staves and Scrolls are 30% more powerful, enchantments cost 30% less charges)"},
   //323
  {name : "Soul Gem Mastery", skill : 17, skillReq : 25,
   xPos : 246/4, yPos : 218/4, preReqs : [318], nextPerk: -1,
   description : "You've learned how to draw more energy from soul gems and are now able to craft them at a smelter by transmuting and melting certain minerals. (+50% charge from soul gems, craft soul gems and apprentice level staves and scrolls)"},
   //324
  {name : "Arcane Experimentation", skill : 17, skillReq : 50,
   xPos : 259/4, yPos : 176/4, preReqs : [323], nextPerk: -1,
   description : "Your studies have enabled you to research unique enchantments of your own and to craft better staves at the forge. (new enchantments are 20% stronger, learn five new enchantments with Arcane Experimentation power, craft adept level staves and scrolls)"},
   //325
  {name : "Artificer's Insight", skill : 17, skillReq : 75,
   xPos : 264/4, yPos : 125/4, preReqs : [324], nextPerk: -1,
   description : "You could fill grimoires with your newfound knowledge that allows you to create even better enchantments and staves. (new enchantments are 25% stronger, learn five new enchantments with Artificer's Insight power, craft expert level staves and scrolls)"},
   //326
  {name : "Elemental Lore", skill : 17, skillReq : 25,
   xPos : 138/4, yPos : 219/4, preReqs : [318], nextPerk: -1,
   description : "You've learned how to tame the elements most efficiently. Thus, all elemental enchantments are stronger. (new elemental enchantments are 50% stronger, you can craft runestones and create runestone enchantments)"},
   //327
  {name : "Corpus Lore", skill : 17, skillReq : 50,
   xPos : 150/4, yPos : 150/4, preReqs : [326], nextPerk: -1,
   description : "You've become skilled in using enchantments to strengthen mind and body. Thus, all such enchantments are stronger. (new attribute enchantments are 50% stronger and you can make more advanced runestone enchantments)"},
   //328
  {name : "Skill Lore", skill : 17, skillReq : 75,
   xPos : 191/4, yPos : 93/4, preReqs : [327], nextPerk: -1,
   description : "You've become a master of infusing enchantments that transfer knowledge and skill to the user, making all such ones stronger. (new skill enchantments are 50% stronger, Ebony Smiths can permanently imbue unique enchantments onto their weapons)"},
   //329
  {name : "Enchantment Mastery", skill : 17, skillReq : 90,
   xPos : 258/4, yPos : 64/4, preReqs : [328,325], nextPerk: -1,
   description : "You've found a way to bind even more energy into inanimate matter. (new enchantments are 10% stronger, can place two enchantments with 60% strength each, craft master level staves and scrolls, 0.8x staff charge cost)"},
   //330
  {name : "Artifact Enchanter", skill : 17, skillReq : 100,
   xPos : 225/4, yPos : 30/4, preReqs : [329], nextPerk: -1,
   description : "With great skill and dedication, you get a chance to enchant an item with extraordinary strength. (enchant one item with twice the strength, can place three enchantments with 50% strength each)"},
   
   //sub-class
   
   //331	
  {name : "Destiny", skill : 18, skillReq : 1,
   xPos : 200/4, yPos : 375/4, preReqs : [], nextPerk: -1,
   description : "Increases carry weight by 25."},  
   //332	
  {name : "Focus", skill : 18, skillReq : 5,
   xPos : 100/4, yPos : 325/4, preReqs : [331], nextPerk: -1,
   description : "Your Magicka Regeneration is increased by 50%"},
   //333	
  {name : "Constitution", skill : 18, skillReq : 5,
   xPos : 200/4, yPos : 325/4, preReqs : [331], nextPerk: -1,
   description : "Your Health Regeneration is increased by 50%"},
   //334	
  {name : "Endurance", skill : 18, skillReq : 5,
   xPos : 300/4, yPos : 325/4, preReqs : [331], nextPerk: -1,
   description : "Your Stamina Regeneration is increased by 50%"},
   //335
  {name : "Mage", skill : 18, skillReq : 10,
   xPos : 100/4, yPos : 275/4, preReqs : [332], nextPerk: -1,
   description : "Your spells and enchantments cost 5% less Magicka"},
   //336
  {name : "Warrior", skill : 18, skillReq : 10,
   xPos : 200/4, yPos : 275/4, preReqs : [333], nextPerk: -1,
   description : "You deal 5% more weapon damage"},  
   //337
  {name : "Thief", skill : 18, skillReq : 10,
   xPos : 300/4, yPos : 275/4, preReqs : [334], nextPerk: -1,
   description : "You are 10% harder to detect"},  
   //338	
  {name : "Fortification", skill : 18, skillReq : 15,
   xPos : 50/4, yPos : 225/4, preReqs : [335], nextPerk: -1,
   description : "Your Health, Magicka and Stamina are increased by 10"},
   //339	
  {name : "Magicka Surge", skill : 18, skillReq : 15,
   xPos : 100/4, yPos : 200/4, preReqs : [335], nextPerk: -1,
   description : "Your Magicka Regeneration is increased by 400% when your Magicka falls below 25%"},
    //340	
  {name : "Magicka Shell", skill : 18, skillReq : 15,
   xPos : 150/4, yPos : 225/4, preReqs : [-335,-336], nextPerk: -1,
   description : "Your magic resistance is increased by 10%"},	
    //341	
  {name : "Iron Skin", skill : 18, skillReq : 15,
   xPos : 200/4, yPos : 200/4, preReqs : [336], nextPerk: -1,
   description : "Every 10 seconds, taking damage increases your Armor Rating by 150 for 6 seconds"},
   //342	
  {name : "Battle Spirit", skill : 18, skillReq : 15,
   xPos : 250/4, yPos : 225/4, preReqs : [-336,-337], nextPerk: -1,
   description : "Power attacks increase your attack damage by 10% for 6 seconds"},
   //343	
  {name : "Adrenaline", skill : 18, skillReq : 15,
   xPos : 300/4, yPos : 200/4, preReqs : [337], nextPerk: -1,
   description : "Your Stamina Regeneration is increased by 200% when your Stamina falls below 25%"},
  //344	
  {name : "Swiftness", skill : 18, skillReq : 15,
   xPos : 350/4, yPos : 225/4, preReqs : [337], nextPerk: -1,
   description : "Every 10 seconds, taking damage increases your movement speed by 20% for 6 seconds"},   
   //345	
  {name : "Agent", skill : 18, skillReq : 20,
   xPos : 50/4, yPos : 150/4, preReqs : [338], nextPerk: -1,
   description : "Enemy attacks against you slows them by 25% for 5 seconds"},
   //346	
  {name : "Sorcerer", skill : 18, skillReq : 20,
   xPos : 100/4, yPos : 150/4, preReqs : [339], nextPerk: -1,
   description : "You take 10% less damage while casting spells"},
    //347	
  {name : "Spellsword", skill : 18, skillReq : 20,
   xPos : 150/4, yPos : 150/4, preReqs : [340], nextPerk: -1,
   description : "You restore 15 magicka per weapon attack"},
    //348	
  {name : "Knight", skill : 18, skillReq : 20,
   xPos : 200/4, yPos : 150/4, preReqs : [341], nextPerk: -1,
   description : "You take 10% less damage while power attacking, drawing a bow, or blocking"},
   //349	
  {name : "Endurance", skill : 18, skillReq : 20,
   xPos : 250/4, yPos : 150/4, preReqs : [342], nextPerk: -1,
   description : "You regenerate stamina 100% faster"},
   //350	
  {name : "Scout", skill : 18, skillReq : 20,
   xPos : 300/4, yPos : 150/4, preReqs : [343], nextPerk: -1,
   description : "Your bows, crossbows and throwing knives do 10% more damage."},
  //351	
  {name : "Spellblade", skill : 18, skillReq : 20,
   xPos : 350/4, yPos : 150/4, preReqs : [344], nextPerk: -1,
   description : "Attacks with weapons have a 30% chance to interrupt casting enemies"},   
   //352	
  {name : "Leadership", skill : 18, skillReq : 25,
   xPos : 25/4, yPos : 100/4, preReqs : [345], nextPerk: -1,
   description : "Nearby allies move 15% faster during combat"},
   //353	
  {name : "Hard Skin", skill : 18, skillReq : 25,
   xPos : 50/4, yPos : 75/4, preReqs : [345], nextPerk: -1,
   description : "Your Armor Rating is increased by 100"},
   //354	
  {name : "Healing<br>Presence", skill : 18, skillReq : 25,
   xPos : 75/4, yPos : 100/4, preReqs : [-345,-346], nextPerk: -1,
   description : "You heal yourself and nearby allies for 10 Health every 10 seconds"},
   //355	
  {name : "Absorption", skill : 18, skillReq : 25,
   xPos : 100/4, yPos : 75/4, preReqs : [346], nextPerk: -1,
   description : "You have a 10% chance to absorb the Magicka from incoming spells"},
    //356	
  {name : "Conjuring<br>Presence", skill : 18, skillReq : 25,
   xPos : 125/4, yPos : 100/4, preReqs : [-346,-347], nextPerk: -1,
   description : "Nearby summoned or reanimated allies have 50 increased Health,, 50 increases Armor Rating and reflect 15% physical damage"},
    //357	
  {name : "Corrosive<br>Weapon", skill : 18, skillReq : 25,
   xPos : 150/4, yPos : 75/4, preReqs : [347], nextPerk: -1,
   description : "Power attacks reduces enemies magic resistance by 15% and Armor Rating by 75 for 10 seconds"},
    //358	
  {name : "Leeching<br>Strikes", skill : 18, skillReq : 25,
   xPos : 175/4, yPos : 100/4, preReqs : [-347,-348], nextPerk: -1,
   description : "You absorb 15 Health over 3 seconds from enemies attacking you once every 10 seconds for each enemy. While below 25% Health, absorbed Health is doubled"},
    //359	
  {name : "Unyielding", skill : 18, skillReq : 25,
   xPos : 200/4, yPos : 75/4, preReqs : [348], nextPerk: -1,
   description : "While blocking, your health, stamina and magicka regeneration are increased by 25%"},
    //360	
  {name : "Overwhelming<br>Presence", skill : 18, skillReq : 25,
   xPos : 225/4, yPos : 100/4, preReqs : [-348,-349], nextPerk: -1,
   description : "Close enemies have 100 reduced Armor Rating"},
   //361	
  {name : "Smash", skill : 18, skillReq : 25,
   xPos : 250/4, yPos : 75/4, preReqs : [349], nextPerk: -1,
   description : "Power attacks deal 10% more damage"},
   //362	
  {name : "Trickster", skill : 18, skillReq : 25,
   xPos : 275/4, yPos : 100/4, preReqs : [-349,-350], nextPerk: -1,
   description : "You have a 10% chance to evade enemy weapon attacks"},
   //363	
  {name : "Swift Shadow", skill : 18, skillReq : 25,
   xPos : 300/4, yPos : 75/4, preReqs : [350], nextPerk: -1,
   description : "You move 20% faster while sneaking"},
   //364	
  {name : "Viper's Blade", skill : 18, skillReq : 25,
   xPos : 325/4, yPos : 100/4, preReqs : [-350,-351], nextPerk: -1,
   description : "Power attacks reduces enemies poison resistance by 50% for 10 seconds"},
  //365
  {name : "Evasion", skill : 18, skillReq : 25,
   xPos : 350/4, yPos : 75/4, preReqs : [351], nextPerk: -1,
   description : "You have a 15% chance to evade spells"},  
  //366
  {name : "Silent Blade", skill : 18, skillReq : 25,
   xPos : 375/4, yPos : 100/4, preReqs : [351], nextPerk: -1,
   description : "Your attacks deal 25 damage to Magicka"},    
   //367	
  {name : "Bard", skill : 18, skillReq : 30,
   xPos : 25/4, yPos : 50/4, preReqs : [352], nextPerk: -1,
   description : "Nearby allies deal 15% more physical damage and have 15% magic resistance during combat"},
   //368	
  {name : "Shaman", skill : 18, skillReq : 30,
   xPos : 50/4, yPos : 25/4, preReqs : [353], nextPerk: -1,
   description : "You deal 20% more damage against impaired enemies"},
   //369	
  {name : "Templar", skill : 18, skillReq : 30,
   xPos : 75/4, yPos : 50/4, preReqs : [354], nextPerk: -1,
   description : "Every 90 seconds, falling below 10% Health, you are immune to any damage for 6 seconds and heal yourself afterwards for 100 Health"},
   //370	
  {name : "Archmage", skill : 18, skillReq : 30,
   xPos : 100/4, yPos : 25/4, preReqs : [355], nextPerk: -1,
   description : "Your Spells are 15% stronger or last 30% longer"},
    //371	
  {name : "Summoner", skill : 18, skillReq : 30,
   xPos : 125/4, yPos : 50/4, preReqs : [356], nextPerk: -1,
   description : "You can summon or reanimate one additional minion"},
    //372	
  {name : "Battlemage", skill : 18, skillReq : 30,
   xPos : 150/4, yPos : 25/4, preReqs : [357], nextPerk: -1,
   description : "Power attacks cost 25% less stamina if you have a spell in your left hand. Spell & enchantment cost 10% less if you have a weapon in your right hand"},
    //373	
  {name : "Blood Knight", skill : 18, skillReq : 30,
   xPos : 175/4, yPos : 50/4, preReqs : [358], nextPerk: -1,
   description : "While above 50% Health you deal 10% more weapon damage and while below 50% Health, you take 25% less magic damage"},
    //374	
  {name : "General", skill : 18, skillReq : 30,
   xPos : 200/4, yPos : 25/4, preReqs : [359], nextPerk: -1,
   description : "Your weapon damage and Armor Rating is increased by 10%"},
    //375	
  {name : "Monk", skill : 18, skillReq : 30,
   xPos : 225/4, yPos : 50/4, preReqs : [360], nextPerk: -1,
   description : "Your attacks deal 50 bleeding damage over 5 seconds"},
   //376	
  {name : "Berserker", skill : 18, skillReq : 30,
   xPos : 250/4, yPos : 25/4, preReqs : [361], nextPerk: -1,
   description : "You take 25% less damage while power attacking and power attack stamina usage is reduced by 20%"},
   //377	
  {name : "Saboteur", skill : 18, skillReq : 30,
   xPos : 275/4, yPos : 50/4, preReqs : [362], nextPerk: -1,
   description : "Your attacks have a 15% chance to stagger enemies. You deal 25% more damage against staggered enemies"},
   //378	
  {name : "Assassin", skill : 18, skillReq : 30,
   xPos : 300/4, yPos : 25/4, preReqs : [363], nextPerk: -1,
   description : "Every 10 seconds, your next attack deals 100% more damage"},
   //379	
  {name : "Rogue", skill : 18, skillReq : 30,
   xPos : 325/4, yPos : 50/4, preReqs : [364], nextPerk: -1,
   description : "Your attacks deal 50 poison damage over 10 seconds"},
  //380
  {name : "Stalker", skill : 18, skillReq : 30,
   xPos : 350/4, yPos : 25/4, preReqs : [365], nextPerk: -1,
   description : "Your attacks slows enemies by 50% for 3 seconds"},  
  //381
  {name : "Nightblade", skill : 18, skillReq : 30,
   xPos : 375/4, yPos : 50/4, preReqs : [366], nextPerk: -1,
   description : "Against enemies that are out of Magicka, your attacks deal 20% more damage and have a 30% chance to dispel magic"},  	
   
   //traits
   
  //382
  {name : "Addict", skill : 19, skillReq: 0,
   xPos : 25/4, yPos : 25/4, preReqs : [], nextPerk: -1,
   description : "You've developed some bad habits. Skooma and alcohol benefits last 2x as long and you can craft skooma at cooking pot. When not under the effects of alcohol or skooma, you have a 25% chance to get staggered when hit."},
   //383
  {name : "Adrenaline <br> Rush", skill : 19, skillReq: 0,
   xPos : 75/4, yPos : 25/4, preReqs : [], nextPerk: -1,
   description : "You possess a natural flight response. When at less than 20% health, you move 20% faster and regenerate 1 stamina per second but also deal 30% less damage when below this threshold."},
   //384
  {name : "Au <br> Naturel", skill : 19, skillReq: 0,
   xPos : 125/4, yPos : 25/4, preReqs : [], nextPerk: -1,
   description : "Embrace your divine gifts! Start with +100 health, magicka, and stamina. For each piece of armor or clothing you wear, you lose 40 from each attribute (up to a maximum loss of -160 with four pieces equipped). Additionally, you gain +1 to health, magicka, and stamina per level for each empty armor slot (head, chest, hands, and feet)."},
   //385
  {name : "Bad <br> Natured", skill : 19, skillReq: 0,
   xPos : 175/4, yPos : 25/4, preReqs : [], nextPerk: -1,
   description : "You were born into wickedness. Your attacks while being crouched deals 20% more and you're better at pickpocketing. However, attacks while standing up do 20% less and wearing a divine amulet will hurt you."},
   //386
  {name : "Bane of <br> the Wicked", skill : 19, skillReq: 0,
   xPos : 225/4, yPos : 25/4, preReqs : [], nextPerk: -1,
   description : "You are an enemy to all things abhorrent. Deal 20% more damage to undead, daedra and werewolves. However, do 10% less damage to other beings."},
   //387
  {name : "Bulwark", skill : 19, skillReq: 0,
   xPos : 275/4, yPos : 25/4, preReqs : [], nextPerk: -1,
   description : "When walking or standing still, you gain 200 armor rating and reflect 10% physical damage. You drain 1 additional stamina per second while sprinting and 0.25 when running."},
   //388
  {name : "Defiler", skill : 19, skillReq: 0,
   xPos : 325/4, yPos : 25/4, preReqs : [], nextPerk: -1,
   description : "The only use you have for the living is to resurrect them in death. Deal 20% more damage to playable races. However, do 10% less damage to other beings."},
   //389
  {name : "Disciplined", skill : 19, skillReq: 0,
   xPos : 375/4, yPos : 25/4, preReqs : [], nextPerk: -1,
   description : "Shoot to kill. Bows and crossbows deal 20% more damage. However, they draw/reload 40% slower."},
   //390
  {name : "Dovah <br> Tinvaak", skill : 19, skillReq: 0,
   xPos : 25/4, yPos : 75/4, preReqs : [], nextPerk: -1,
   description : "You are fluent in Dragon speech and as such can shout 10% more often, at 20% reduced effectiveness."},
   //391
  {name : "Elemental <br> Conduit", skill : 19, skillReq: 0,
   xPos : 75/4, yPos : 75/4, preReqs : [], nextPerk: -1,
   description : "Fire spells are more powerful in sunny weather but lose potency in the rain. <br>Shock spells are enhanced during rain but are less effective in snowy conditions. <br>Frost spells excel in snowy weather but weaken under sunny skies."},
   //392
  {name : "Fast <br> Shot", skill : 19, skillReq: 0,
   xPos : 125/4, yPos : 75/4, preReqs : [], nextPerk: -1,
   description : "You'd rather shoot fast than shoot hard. Bows draw 40% faster, crossbows reload 40% faster. However, bows and crossbows deal 30% less damage."},
   //393
  {name : "Focused", skill : 19, skillReq: 0,
   xPos : 175/4, yPos : 75/4, preReqs : [], nextPerk: -1,
   description : "When in danger, you think before acting. When at less than 20% health, you regenerate 5 magicka per second and absorb 10% of incoming spells. However, you take 10% more damage when below this threshold."},
   //394
  {name : "Gambler", skill : 19, skillReq: 0,
   xPos : 225/4, yPos : 75/4, preReqs : [], nextPerk: -1,
   description : "You go in all or nothing. Gain 50% chance to critical hit. However, overall weapon damage is reduced by 40%. When you land a critical hit, your attacks do 10% more damage for 30 seconds (stackable up to 5 times)."},
   //395
  {name : "Giantkin", skill : 19, skillReq: 0,
   xPos : 275/4, yPos : 75/4, preReqs : [], nextPerk: -1,
   description : "Descended from the mighty giants; you gain 10% magic resistance and damage with blunt weapons, however you cannot read skill books, or use scrolls and staves."},
   //396
  {name : "Glutton", skill : 19, skillReq: 0,
   xPos : 325/4, yPos : 75/4, preReqs : [], nextPerk: -1,
   description : "You LOVE food but hate medicine. Food benefits are 25% stronger but potions have only 50% their efficiency."},
   //397
  {name : "Good <br> Natured", skill : 19, skillReq: 0,
   xPos : 375/4, yPos : 75/4, preReqs : [], nextPerk: -1,
   description : "You have a good heart. Deal 20% less damage with weapons and Destruction spells. However, while wearing an amulet of the divines beneficial spells and potions last 20% longer and you take 20% less damage."},
   //398
  {name : "Hoarder", skill : 19, skillReq: 0,
   xPos : 25/4, yPos : 125/4, preReqs : [], nextPerk: -1,
   description : "You love carrying stuff around, even if it's junk. Gain +200 carryweight. Selling prices are 50% worse."},
   //399
  {name : "Jack of <br> All Spells", skill : 19, skillReq: 0,
   xPos : 75/4, yPos : 125/4, preReqs : [], nextPerk: -1,
   description : "But master of none. Novice, Apprentice and Adept spells are 20% stronger or longer lasting, expert and master spells are 20% weaker or shorter."},
   //400
  {name : "King of <br> Worms", skill : 19, skillReq: 0,
   xPos : 125/4, yPos : 125/4, preReqs : [], nextPerk: -1,
   description : "You've gained hidden insight into necromantic arts. You can have 1 additional summon or undead thrall. However, the duration of summon and resurrecting spells is reduced by 33%."},
   //401
  {name : "Light <br> Foot", skill : 19, skillReq: 0,
   xPos : 175/4, yPos : 125/4, preReqs : [], nextPerk: -1,
   description : "You've never felt comfortable in footwear. When not wearing boots/shoes, your movement is muffled, you move 5% faster and suffer no fall damage. When wearing boots/shoes you move 10% slower."},
   //402
  {name : "Marathon <br> Runner", skill : 19, skillReq: 0,
   xPos : 225/4, yPos : 125/4, preReqs : [], nextPerk: -1,
   description : "You regenerate 5 stamina per second while sprinting. However, you will not be able to gain any stamina while running or standing still."},
   //403
  {name : "Nosferatu", skill : 19, skillReq: 0,
   xPos : 275/4, yPos : 125/4, preReqs : [], nextPerk: -1,
   description : "You're an ugly sight and live in the sewers. -50 speech, no health, magicka or stamina regen outdoors. Eating skeever meat gives you a 20% speed boost and restores 10 health, magicka and stamina per second for 180 seconds."},
   //404
  {name : "Old <br> Fashioned", skill : 19, skillReq: 0,
   xPos : 325/4, yPos : 125/4, preReqs : [], nextPerk: -1,
   description : "If it ain't broke, don't fix it. Weapons, armor and magical staves made of iron, wood, steel, fur or hide are 15% stronger. Otherwise, they are 10% weaker."},
   //405
  {name : "Pacifist", skill : 19, skillReq: 0,
   xPos : 375/4, yPos : 125/4, preReqs : [], nextPerk: -1,
   description : "When your arms are lowered you restore 2 magicka and stamina per second. However, raising your hands in combat will have the opposite effect. Those born under the sign of the Atronach do not gain any benefits."},
   //406
  {name : "Rage", skill : 19, skillReq: 0,
   xPos : 25/4, yPos : 175/4, preReqs : [], nextPerk: -1,
   description : "You possess a natural fight response. When at less than 20% health, you deal 20% more damage and take 20% less damage. However, you move 30% slower when below this threshold."},
   //407
  {name : "Skilled", skill : 19, skillReq: 0,
   xPos : 75/4, yPos : 175/4, preReqs : [], nextPerk: -1,
   description : "Reading skill books grants an extra skill point and trainers cost 50% less, however every 5 levels you don't gain a perk point."},
   //408
  {name : "Soul <br> Reaver", skill : 19, skillReq: 0,
   xPos : 125/4, yPos : 175/4, preReqs : [], nextPerk: -1,
   description : "You've claimed countless souls for your gain. Weapon and armor enchantments are 10% stronger and use 10% less charge. Armor rating and weapon damage is reduced by 10%."},
   //409
  {name : "Swimmer", skill : 19, skillReq: 0,
   xPos : 175/4, yPos : 175/4, preReqs : [], nextPerk: -1,
   description : "You prefer life on the water. In water, you swim 30% faster, can breath underwater and regenerate health, stamina and magicka by a flat 1 per second. On land, you suffer 25% less health, stamina and magicka regeneration."},
   //410
  {name : "Unbound <br> Hands", skill : 19, skillReq: 0,
   xPos : 225/4, yPos : 175/4, preReqs : [], nextPerk: -1,
   description : "Handwear constricts you. Spells are 15% stronger and unarmed attacks do +30 more damage when not wearing gloves/gauntlets. However, they suffer the opposite effect when wearing gloves/gauntlets."},
   //411
  {name : "Way of <br> the Voice", skill : 19, skillReq: 0,
   xPos : 275/4, yPos : 175/4, preReqs : [], nextPerk: -1,
   description : "You follow the pacifist creed of the Greybeards, and as such your hostile shouts are 30% less effective, but using non-hostile shouts has a 20% chance reset the shout cooldown."},
   //412
  {name : "Witcher", skill : 19, skillReq: 0,
   xPos : 325/4, yPos : 175/4, preReqs : [], nextPerk: -1,
   description : "Potions and poisons you craft are 20% more effective, and consuming raw ingredients grants double the effect. However, you can only benefit from up to four active potion effects at a time."},
   
   //missed things in 2.8
   
   //413
  {name : "Arcane Assassin", skill : 7, skillReq: 25,
   xPos : 225/4, yPos : 200/4, preReqs : [119], nextPerk: 414,
   description : "You can suppress the noise cast by your spell and deliver stronger effect to unwary targets. (Spells and enchantments are silent when cast out of combat, spells are 10% more powerful on targets while undetected)"},
   //414
  {name : "Arcane Assassin", skill : 7, skillReq: 50,
   xPos : 225/4, yPos : 200/4, preReqs : [413], nextPerk: 415,
   description : "You can suppress the noise cast by your spell and deliver stronger effect to unwary targets. (Spells and enchantments are silent when cast out of combat, spells are 30% more powerful on targets while undetected)"},
   //415
  {name : "Arcane Assassin", skill : 7, skillReq: 75,
   xPos : 225/4, yPos : 200/4, preReqs : [414], nextPerk: -1,
   description : "You can suppress the noise cast by your spell and deliver stronger effect to unwary targets. (Spells and enchantments are silent when cast out of combat, spells are 50% more powerful on targets while undetected)"},
  //416
  {name : "Staff Channeling", skill : 17, skillReq: 30,
   xPos : 325/4, yPos : 225/4, preReqs : [320], nextPerk: 417,
   description : "You can use your staff to empower your own spells and cast them more efficiently. (While holding a staff, spells are 5% more powerful and cost 10% less magicka to cast)"},
  //417
  {name : "Staff Channeling", skill : 17, skillReq: 60,
   xPos : 325/4, yPos : 225/4, preReqs : [416], nextPerk: -1,
   description : "You can use your staff to empower your own spells and cast them more efficiently. (While holding a staff, spells are 10% more powerful and cost 20% less magicka to cast)"},
   
   
 // new stuff added in 3.0
 
 
  //418 - Perk # 0 changed to rank 2 and rank 1 added as #418 so Advanced blacksmithing option works
  {name : "Craftsmanship", skill : 0, skillReq : 0,
  xPos : 250/5, yPos : 220/3.5, preReqs : [], nextPerk: 0,
  description : "You've read The Armorer's Encyclopedia and know how to properly use all kinds of tools. You now also understand the secondary material properties of Iron and Steel weapons. (Requires 'The Armorer's Encyclopedia')"},
  //419
  {name : "Tailoring & Polishing", skill : 0, skillReq : 0,
  xPos : 180/5, yPos : 375/5, preReqs : [], nextPerk: -1,
  description : "You've spent some time learning to tailor and polish gems, you are able to craft a variety of clothing items. Also, each article of worn clothing provides additional warmth and you can polish rough gems."},   
  //420
   {name : "Shivering Isles Smithing", skill : 0, skillReq : 100,
    xPos : 250/5, yPos : 200/5, preReqs : [-6,-9], nextPerk: -1,
    description : "On your travels you have discovered the secrets to unleash the power of the mystical amber and madness ore of the Shivering Isles. Few could hope to achieve such a feat without losing their mind..."},
  //421
  {name : "Sharp Throw", skill : 5, skillReq : 50,
   xPos : 150/4, yPos : 125/4, preReqs : [95], nextPerk: -1,
   description : "You can throw knives more precisely. (50% more damage with throwing knives)"},
   //422
  {name : "Hunter", skill : 8, skillReq : 20,
   xPos : 325/4, yPos : 275/4, preReqs : [128], nextPerk: 423,
   description : "You've spent significant time hunting in the wilderness and can deal more damage to most animals. Deal 20% more damage to all animals."},
   //423
  {name : "Hunter", skill : 8, skillReq : 40,
   xPos : 325/4, yPos : 275/4, preReqs : [422], nextPerk: -1,
   description : "You've spent significant time hunting in the wilderness and can deal more damage to most animals. Deal 40% more damage to all animals."}, 
   //424
  {name : "Survival Instincts", skill : 8, skillReq : 40,
   xPos : 325/4, yPos : 175/4, preReqs : [422], nextPerk: -1,
   description : "While others would ignore the threats of the elements, you understand the danger. Regenerate stamina and magicka 100% faster when outdoors and out of combat."},  
   //425
  {name : "Taming", skill : 8, skillReq : 60,
   xPos : 325/4, yPos : 75/4, preReqs : [424], nextPerk: -1,
   description : "You have mastered the outdoors and all of Skyrim's fauna. Gain a power to tame nearby animals under 50% health. Also move 10% faster outdoors."},
   //426
  {name : "Pocket Sand", skill : 9, skillReq : 25,
   xPos : 375/4, yPos : 250/4, preReqs : [154], nextPerk: -1,
   description : "You're quick thinking and even quicker with your hands. Can now create pocket sand at a forge and use it to impair enemies."},
   //427
  {name : "Quick Sand", skill : 9, skillReq : 50,
   xPos : 375/4, yPos : 150/4, preReqs : [426], nextPerk: -1,
   description : "Your pocket sand can now slow down enemies, making it easier to escape combat."},
   //428
  {name : "Poisoned Clamps", skill : 9, skillReq : 25,
   xPos : 300/4, yPos : 225/4, preReqs : [154], nextPerk: -1,
   description : "Traps can now be poisoned."},
   //429
  {name : "Salt on the Wound", skill : 9, skillReq : 50,
   xPos : 300/4, yPos : 125/4, preReqs : [428], nextPerk: -1,
   description : "When deploying a trap, you can consume elemental salt to coat it. Affected enemies take minor elemental damage, and on death, summon an atronach."},
   //430
  {name : "Battle Muse", skill : 10, skillReq : 0,
   xPos : 85/4, yPos : 350/4, preReqs : [], nextPerk: -1,
   description : "Your mastery of musical instruments turns the tide of battle. Drums inspire your allies, the flute soothes your foes and the lute stirs chaos amoung your enemies."},
   //431
  {name : "Standing <br> Ovation", skill : 10, skillReq : 25,
   xPos : 20/4, yPos : 250/4, preReqs : [430], nextPerk: -1,
   description : "Your captivating performances leave the crowd in awe. The bonuses recieved from playing for a crowd at the inns are now doubled and last twice as long."},
   //432
  {name : "Boozy <br> Bard", skill : 10, skillReq : 25,
   xPos : 55/4, yPos : 250/4, preReqs : [430], nextPerk: -1,
   description : "Alcohol makes the music flow sweeter! Alcoholic drinks no longer blur your vision and perfoming under the influence enhances your musical powers, increasing their effectiveness."},
   //433
  {name : "Windborne <br> Melody", skill : 10, skillReq : 25,
   xPos : 90/4, yPos : 250/4, preReqs : [430], nextPerk: -1,
   description : "Your music flows as freely as the wind. Playing an instrument no longer slows your movement."},
   //434
  {name : "Skald", skill : 10, skillReq : 50,
   xPos : 95/4, yPos : 175/4, preReqs : [433], nextPerk: -1,
   description : "Continuously playing instruments during combat now grrants additional benefits. Drums bolster your allies, while the Lute and Flute weaken your enmies' defences."},
   //435
  {name : "Symphony <br> of Storms", skill : 10, skillReq : 75,
   xPos : 100/4, yPos : 100/4, preReqs : [434], nextPerk: -1,
   description : "The bard's mastery over their instrument echoes through the heavens. The deep and powerful resonance of your music calls forth elemental storms, which each instrument summoning its own fury."},
   //436
  {name : "Wand Mastery", skill : 17, skillReq : 50,
   xPos : 300/4, yPos : 150/4, preReqs : [416], nextPerk: -1,
   description : "You have learned to use your wand's innate mystical properties to focus your thoughts. (+100% magicka regeneration when holding a wand)"},
   //437
  {name : "Athletics", skill : 6, skillReq : 25,
   xPos : 200/4, yPos : 150/4, preReqs : [111], nextPerk: 438,
   description : "You are more agile and can recover from exhaustion faster. (+5% movement speed and +25% stamina regeneration when not wearing heavy armor)"},
   //438
  {name : "Athletics", skill : 6, skillReq : 50,
   xPos : 200/4, yPos : 150/4, preReqs : [437], nextPerk: -1,
   description : "You are more agile and can recover from exhaustion faster. (+10% movement speed and +50% stamina regeneration when not wearing heavy armor)"},
   
   //Lorerim ver 4.0.4 new perks from rzrn
   
   //439
   {name : "Final Stand", skill : 4, skillReq : 80,
   xPos : 315/4, yPos : 150/4, preReqs : [79], nextPerk: -1,
   description : "Power attacks deal up to 100% more damage below half Health. The damage bonus increases as your Health decreases."},
   //440
   {name : "Heavy Slam", skill : 4, skillReq : 80,
   xPos : 265/4, yPos : 150/4, preReqs : [75], nextPerk: -1,
   description : "Whenever a standing power attack with a mace inflicts a critical strike, it deals 3% more critical damage per point of Stamina."},
   //441
   {name : "Guillotine", skill : 4, skillReq : 80,
   xPos : 135/4, yPos : 150/4, preReqs : [71], nextPerk: -1,
   description : "Standing power attacks with war axes execute targets below 25% Health, delivering a critical strike that deals twenty times critical damage."},
   //442
   {name : "Death Adder", skill : 4, skillReq : 80,
   xPos : 85/4, yPos : 150/4, preReqs : [67], nextPerk: -1,
   description : "Forward power attacks with a dagger ignore 25% of armor."},
   //443
  {name : "Battle Hide", skill : 3, skillReq : 80,
   xPos : 75/4, yPos : 162/4, preReqs : [43], nextPerk: -1,
   description : "You take half damage from enemy attacks while power attacking or blocking with quarterstaves and battlestaves."}, 
   //444
  {name : "Execute", skill : 3, skillReq : 80,
   xPos : 125/4, yPos : 162/4, preReqs : [47], nextPerk: -1,
   description : "Standing power attacks with battleaxes and halberds execute targets below 25% Health, delivering a critical strike that deals twenty times critical damage."}, 
   //445
  {name : "Critical Slam", skill : 3, skillReq : 80,
   xPos : 325/4, yPos : 162/4, preReqs : [55], nextPerk: -1,
   description : "Whenever a standing power attack with a warhammer inflicts a critical strike, it deals 3% more critical damage per point of Stamina."}, 
   //446
  {name : "Death or Glory", skill : 3, skillReq : 80,
   xPos : 275/4, yPos : 162/4, preReqs : [51], nextPerk: -1,
   description : "Two-handed power attacks with greatswords and pikes deal up to 100% more damage below half Health. The damage bonus increases as your Health decreases."}, 
   //447
  {name : "Focus on the Prey", skill : 5, skillReq : 30,
   xPos : 250/4, yPos : 225/4, preReqs : [100], nextPerk: -1,
   description : "Cannot be staggered while holding a drawn bow or reloading a crossbow."},
   //448
  {name : "Three Crows", skill : 5, skillReq : 75,
   xPos : 250/4, yPos : 155/4, preReqs : [101], nextPerk: -1,
   description : "Shooting a target beyond 25 feet three times in rapid succession, leaving less than 2.75 seconds between each hit, deals bonus damage equal to 15% of the target's current Health (max. 150 damage) and knocks the target to the ground."},
   //449
  {name : "Lion's Arrow", skill : 5, skillReq : 100,
   xPos : 175/4, yPos : 75/4, preReqs : [-99, -102], nextPerk: -1,
   description : "Grants the 'Lion's Arrow' power: use it to store the spell you are dual casting. Shooting a fully drawn bow in combat also releases the stored spell in the direction of the crosshair. Only works with spells that affect other targets."},
   //450
  {name : "Weapons Master", skill : 2, skillReq: 20,
   xPos : 100/3, yPos : 223/4, preReqs : [25], nextPerk: 451,
   description : "You have rejected mastering one specific weapon type. Instead, you use have begun to master versatility. (15% more damage)"},
   //451
  {name : "Weapons Master", skill : 2, skillReq: 40,
   xPos : 100/3, yPos : 223/4, preReqs : [450], nextPerk: -1,
   description : "You have rejected mastering one specific weapon type. Instead, you use have begun to master versatility. (30% more damage)"},
   //452
  {name : "Masterly Strike", skill : 2, skillReq: 60,
   xPos : 100/3, yPos : 173/4, preReqs : [451], nextPerk: -1,
   description : "Your power attacks are now devastating enough to penetrate enemy armor and less exhausting. (-30% power attack stamina cost, +30% armor penetration)"},
   //453
  {name : "Shield's Best Friend", skill : 2, skillReq: 30,
   xPos : 175/3, yPos : 200/4, preReqs : [25], nextPerk: -1,
   description : "Like the Imperial Legions of old, you understand the advantage of shortswords in combat. (20% more bash damage, 20% more block and 20% less poise damage when wielding a shortsword)"},
   //454
  {name : "Smithing<br>Specialization", skill : 0, skillReq : 60,
  xPos : 320/5, yPos : 375/5, preReqs : [1], nextPerk: -1,
  description : "You may choose an item type: One-Handed, Two-Handed, Light Armor, Heavy Armor or Archery. Items of the chosen type can be improved 10% better at a grindstone or workbench."}, 
   //455
  {name : "Iron Law", skill : 0, skillReq : 80,
  xPos : 370/5, yPos : 350/5, preReqs : [454], nextPerk: -1,
  description : "If you Specialized in an armor type, your attacks ignore 15% of the armor rating of enemies wearing items of the chosen type. If you Specialized in a weapon type, you take 10% less damage from weapons of the chosen type."},     
  //456
  {name : "Cushioned", skill : 1, skillReq : 30,
   xPos : 249/4.5, yPos : 250/4.5, preReqs : [13], nextPerk: -1,
   description : "You take half damage from falling if wearing all Heavy Armor."},
   //457
  {name : "Defiance", skill : 1, skillReq : 50,
   xPos : 249/4.5, yPos : 175/4.5, preReqs : [456], nextPerk: -1,
   description : "You are trained to deflect incoming attacks while wearing all Heavy Armor. Whenever an enemy attacks you, you gain 15 points of armor rating for 10 seconds. This effect stacks."},
   //458
  {name : "Never Kneel", skill : 1, skillReq : 75,
   xPos : 249/4.5, yPos : 100/4.5, preReqs : [457], nextPerk: -1,
   description : "If wearing all Heavy Armor, take 30% less attack damage from power attacks."},
   //459
  {name : "Reap the Whirlwind", skill : 1, skillReq : 100,
   xPos : 249/4.5, yPos : 25/4.5, preReqs : [458], nextPerk: -1,
   description : "When struck by a power attack or power bash, your attacks deal 50% more damage to the attacker for 5 seconds if wearing all Heavy Armor."},
   //460
  {name : "Annoying <br> Mosquitoes", skill : 6, skillReq : 40,
   xPos : 200/4, yPos : 100/4, preReqs : [437], nextPerk: 461,
   description : "You take 10% less attack damage from enemies with full Health if not wearing heavy armor"},
   //461
  {name : "Annoying <br> Mosquitoes", skill : 6, skillReq : 60,
   xPos : 200/4, yPos : 100/4, preReqs : [460], nextPerk: -1,
   description : "You take 20% less attack damage from enemies with full Health if not wearing heavy armor"},
   //462
  {name : "Evasive Leap", skill : 6, skillReq : 60,
   xPos : 300/4, yPos : 200/4, preReqs : [110], nextPerk: -1,
   description : "If not wearing heavy armor, jump in combat to cause all incoming attacks and spells to miss for 1 second. This effect has a 10 second cooldown."},
   //463
  {name : "As a Leaf", skill : 6, skillReq : 40,
   xPos : 250/4, yPos : 212/4, preReqs : [110], nextPerk: -1,
   description : "While sprinting in Light Armor or while Unarmored, you cannot be staggered and take 50% less damage from power attacks."},
   //464
  {name : "Death's Emperor", skill : 9, skillReq : 70,
   xPos : 100/4, yPos : 150/4, preReqs : [-144, -152], nextPerk: -1,
   description : "A cursed septim appears in your inventory. When someone else is in possession of the coin, your attacks deal 25% more damage and critical damage to them."},
   //465
  {name : "Mutiny", skill : 9, skillReq : 100,
   xPos : 100/4, yPos : 75/4, preReqs : [464], nextPerk: -1,
   description : "Grants the \"Mutiny\" power. At will, activates the curse of the Death's Emperor, causing whoever is in possession of the coin to attack randomly for 30 seconds. Any deaths resulting from this can't be traced back to you."},
   //466
  {name : "Lawless World", skill : 9, skillReq : 40,
   xPos : 125/4, yPos : 250/4, preReqs : [151], nextPerk: -1,
   description : "Petty crimes are slowly forgotten, allowing your bounties for non-violent crimes to decay at a rate of 50% of your Pickpocket skill level each day."},
   //467
  {name : "Lockdown", skill : 8, skillReq : 40,
   xPos : 225/4, yPos : 225/4, preReqs : [129], nextPerk: -1,
   description : "Activate a hostile automaton to lockpick your way into its engine. Lock difficulty is based on its current Health. Pick its lock within 15 seconds to reduce its Health to 1 and shut it down for 60 seconds. If you fail, you can't try again for 30 seconds."},
   //468
  {name : "Hotwire", skill : 8, skillReq : 60,
   xPos : 225/4, yPos : 150/4, preReqs : [467], nextPerk: -1,
   description : "Activate an automaton under Lockdown to lockpick its brain. Succeed within 15 seconds to hack the automaton, forcing it to follow you and fight for you. If you fail, you can't try again for 30 seconds. You can only have one Hotwired Automaton at a time."},
   //469
  {name : "Percussive Maintenance", skill : 8, skillReq : 100,
   xPos : 225/4, yPos : 75/4, preReqs : [468], nextPerk: -1,
   description : "Your Hotwired Automaton moves 30% faster and attacks 20% faster. Hitting your Hotwired Automaton with a mace or warhammer repairs it 150 points (or 300 points on a power attack) and further increases attack speed by 50% for 10 seconds."},
   //470
  {name : "Problem Solver", skill : 7, skillReq : 80,
   xPos : 350/4, yPos : 125/4, preReqs : [122], nextPerk: -1,
   description : "Sneak attacks deal 10% more damage for each 200 points of Health the target has, up to 50% more damage."},
   //471
  {name : "Fog of War", skill : 7, skillReq : 40,
   xPos : 350/4, yPos : 300/4, preReqs : [119], nextPerk: -1,
   description : "Sneaking is 15% more effective against targets that are in combat with you, or 30% if they are in combat with someone else."},
   //472
  {name : "Tripwire", skill : 7, skillReq : 20,
   xPos : 150/4, yPos : 250/4, preReqs : [119], nextPerk: -1,
   description : "Grants the 'Tripwire' power. At will, places a tripwire in front of you for 120 seconds. It snaps when tripped, knocking all targets hit by it to the floor."},
   //473
  {name : "Whiplash", skill : 7, skillReq : 50,
   xPos : 175/4, yPos : 175/4, preReqs : [472], nextPerk: -1,
   description : "Tripwire also reduces armor rating by 250 points for 10 seconds."},
   //474
  {name : "Cloak and Dagger", skill : 7, skillReq : 70,
   xPos : 350/4, yPos : 200/4, preReqs : [471], nextPerk: -1,
   description : "Breaking invisibility with a power attack is a guaranteed critical strike that deals 50% more critical damage."},
   //475
  {name : "Alkahest", skill : 11, skillReq : 60,
   xPos : 75/3, yPos : 100/4, preReqs : [183], nextPerk: -1,
   description : "Your poisons are highly corrosive, enabling you to ignore 20% of the armor rating of an affected target for their duration."},
   //476
  {name : "World Serpent", skill : 11, skillReq : 90,
   xPos : 100/3, yPos : 50/4, preReqs : [475], nextPerk: -1,
   description : "When you shout, your blood turns poisonous for 15 seconds. The next time you get hit with a weapon, retaliate with a powerful poisonous strike that deals 50 points of poison damage per second for 10 seconds."},
   //477
  {name : "Charge Tap", skill : 17, skillReq : 60,
   xPos : 350/4, yPos : 150/4, preReqs : [416], nextPerk: -1,
   description : "Grants the 'Charge Tap' power. At will, drains a quarter of your current weapon charge to restore Health by 15% of the amount drained and Magicka and Stamina by 25% of the amount drained. (If you have two enchanted weapons equipped, the drain is split.)"},
   //478
  {name : "You Shall Not Pass", skill : 17, skillReq : 80,
   xPos : 325/4, yPos : 100/4, preReqs : [436], nextPerk: -1,
   description : "Simultaneously (within 1 second) using an enchanted staff or wand in your left hand and striking with an enchanted weapon in your right hand releases a flash of light that staggers enemies and deals damage equal to half your Enchanting skill level."},
   
// new traits
   
   //479
  {name : "Acoustic <br> Arcanist", skill : 19, skillReq: 0,
   xPos : 375/4, yPos : 175/4, preReqs : [], nextPerk: -1,
   description : "Your magic flows through melody and vibration. After playing an instrument at an inn, your sonic spells become 20% more powerful. However, your booming presence makes hiring followers more expensive, and your reliance on sound magic weakens your physical attacks by 15%."},
   //480
  {name : "Angler", skill : 19, skillReq: 0,
   xPos : 25/4, yPos : 225/4, preReqs : [], nextPerk: -1,
   description : "Your bond with the sea grants unique benefits. Mudcrabs and slaughterfish become friendly toward you. Fishing yields more valuable items. Fishing rods deal double damage and have a chance to summon a mudcrab to fight at your side. The summoned mudcrab becomes stronger if you're carrying an insect or small fish. Fishing rods can be enchanted. However, your affinity with the waters leaves you 10% more vulnerable to shock damage."},
   //481
  {name : "Blighted <br> Fists", skill : 19, skillReq: 0,
   xPos : 75/4, yPos : 225/4, preReqs : [], nextPerk: -1,
   description : "Your afflictions fuel your fury! Your unarmed attacks deal +10 unresistable disease damage to targets without disease immunity."},
   //482
  {name : "Blood <br> Warrior", skill : 19, skillReq: 0,
   xPos : 125/4, yPos : 225/4, preReqs : [], nextPerk: -1,
   description : "You take 50% more physical damage and have 100% weakness to Poison. However you start with +50 health and gain +5 health per level."},
   //483
  {name : "Disbeliever", skill : 19, skillReq: 0,
   xPos : 175/4, yPos : 225/4, preReqs : [], nextPerk: -1,
   description : "You reject the influence of gods, placing your faith in logic and reason instead. Dwemer weapons and armor are 33% stronger, but you cannot receive blessings from shrines or divines."},
   //484
  {name : "Dominating <br> Will", skill : 19, skillReq: 0,
   xPos : 225/4, yPos : 225/4, preReqs : [], nextPerk: -1,
   description : "Your presence commands fear, intimidation checks almost always succeed, and frenzy spells are 20% stronger. However, your persuasive charm is lacking, making persuasion checks harder, and your pacifying spells are 20% weaker."},
   //484
  {name : "Druid", skill : 19, skillReq: 0,
   xPos : 275/4, yPos : 225/4, preReqs : [], nextPerk: -1,
   description : "Druids are attuned to nature, making spriggans friendly and reducing the cost of druidic spells by up to 30%. You can craft 'Lifebloom Essence' from Taproot and Spriggan Sap for powerful regeneration. However, your bond with the wild leaves you 25% more vulnerable to fire and axes."},
   //485
  {name : "Fatal <br> Attraction", skill : 19, skillReq: 0,
   xPos : 325/4, yPos : 225/4, preReqs : [], nextPerk: -1,
   description : "Your presence is as dangerous as it is alluring. You can choose one gender, you deal 20% more physical damage to the selected gender, but in turn, take 20% more from the other."},
   //486
  {name : "Focused <br> Precision", skill : 19, skillReq: 0,
   xPos : 375/4, yPos : 225/4, preReqs : [], nextPerk: -1,
   description : "Your reliance on careful aim comes at a cost. Arrows and bolts deal 15% less damage, but have a 20% chance to push targets away. The strength of this pushback scales with your Marksman skill."},
   //487
  {name : "Homeowner", skill : 19, skillReq: 0,
   xPos : 25/4, yPos : 275/4, preReqs : [], nextPerk: -1,
   description : "You've secured a place to call your own, choosing one of Skyrim's fine homes to settle in. However, comfort comes at a cost: each week, you must make a mortgage payment based on the home's value."},
   //488
  {name : "Introvert", skill : 19, skillReq: 0,
   xPos : 75/4, yPos : 275/4, preReqs : [], nextPerk: -1,
   description : "You thrive in solitude but falter in the crowd. When facing three or fewer enemies, you deal 15% more damage, whether with weapons or Destruction magic. Against four or more, your nerves get the better of you, and you deal 10% less."},
   //489
  {name : "Lurker", skill : 19, skillReq: 0,
   xPos : 125/4, yPos : 275/4, preReqs : [], nextPerk: -1,
   description : "When not wearing any clothes sneak attacks deal 2.5 times more damage and can sneak 25% better. Eating fish when it's raw and wriggling triggers a powerful healing effect that lasts 10 minutes. However, armor provides no protection, cooked food offers no benefits, and weapons with a weight above 10 will deal no damage."},
   //490
  {name : "Master of <br> Destiny", skill : 19, skillReq: 0,
   xPos : 175/4, yPos : 275/4, preReqs : [], nextPerk: -1,
   description : "You reject the influence of fate and star signs. Standing Stones cannot be used, but you begin the game with 3 additional perk points and a permanent +5 boost to all skills."},
   //491
  {name : "Phalanx", skill : 19, skillReq: 0,
   xPos : 225/4, yPos : 275/4, preReqs : [], nextPerk: -1,
   description : "You deal 15% more damage with spears, javelins, pikes, and halberds. However, you take 50% more damage when hit from behind. Also gives you a unique pike."},
   //492
  {name : "Serene <br> Presence", skill : 19, skillReq: 0,
   xPos : 275/4, yPos : 275/4, preReqs : [], nextPerk: -1,
   description : "Your calming aura makes you effortlessly persuasive: persuasion checks almost always succeed, and pacifying spells are 20% stronger. However, your intimidation attempts are half as likely to succeed, and your frenzy spells are 20% weaker."},
   //493
  {name : "Shehai", skill : 19, skillReq: 0,
   xPos : 325/4, yPos : 275/4, preReqs : [], nextPerk: -1,
   description : "Your bound weapons do 15% more damage. But you take 25% more damage from the undead."},
   //494
  {name : "Silent <br> Dovah", skill : 19, skillReq: 0,
   xPos : 375/4, yPos : 275/4, preReqs : [], nextPerk: -1,
   description : "You choose not to speak the Thu'um, instead hoarding the souls of slain dragons to fuel your own power. For each unspent dragon soul, you gain +10 Health, Magicka, and Stamina. However, this draconic strength rejects the curse of beast or blood: werewolves and vampires cannot harness its power."},
   //495
  {name : "Soul <br> Embed", skill : 19, skillReq: 0,
   xPos : 25/4, yPos : 325/4, preReqs : [], nextPerk: -1,
   description : "At will, you can consume a dragon soul to amplify the magnitude of your shouts by 50% for 1 hour."},
   //496
  {name : "Sunkissed", skill : 19, skillReq: 0,
   xPos : 75/4, yPos : 325/4, preReqs : [], nextPerk: -1,
   description : "You draw strength from the sun's radiant blaze: sun spells are 15% more powerful in your hands. But such warmth comes at a cost: you take 25% more frost damage, and this weakness deepens to 50% beneath the cold veil of night."},
   //497
  {name : "Touch of <br> the Arcane", skill : 19, skillReq: 0,
   xPos : 125/4, yPos : 325/4, preReqs : [], nextPerk: -1,
   description : "Your touch and cloak spells are 20% stronger. All other spell types are 10% weaker or last 10% less."},
   //498
  {name : "Unshakable", skill : 19, skillReq: 0,
   xPos : 175/4, yPos : 325/4, preReqs : [], nextPerk: -1,
   description : "You turn defense into offense. Your shield bashes deal 20% more damage and cost 20% less Stamina. However, your unwavering focus on your shield makes you slower while blocking."},
   //499
  {name : "Wandering <br> Monk", skill : 19, skillReq: 0,
   xPos : 225/4, yPos : 325/4, preReqs : [], nextPerk: -1,
   description : "Power attacks with quarterstaves will force the enemy to drop their weapon to the ground, however this only applies if you're not wearing any armor (light or heavy). You also recieve a unique battlestaff."},
   //500
  {name : "Wizard's <br> Wardrobe", skill : 19, skillReq: 0,
   xPos : 275/4, yPos : 325/4, preReqs : [], nextPerk: -1,
   description : "Your wands are 30% more effective when wearing a wizard hat. When not wearing a wizard hat, all spells are 10% less powerful or last 10% less."},
   
   
   
 ],
};

addPerkData(perkData);
