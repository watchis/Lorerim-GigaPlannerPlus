import { z } from "zod";

export const attributeStatSchema = z.enum(["health", "magicka", "stamina"]);

export const effectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("attribute"),
    stat: attributeStatSchema,
    value: z.number(),
  }),
  z.object({
    type: z.literal("derivedStat"),
    stat: z.string(),
    value: z.number(),
    isPercent: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("skillPointsPerLevel"),
    value: z.number(),
  }),
  z.object({
    type: z.literal("flag"),
    stat: z.string(),
  }),
  z.object({
    type: z.literal("perkPoints"),
    value: z.number(),
  }),
  z.object({
    type: z.literal("traitSlot"),
    value: z.number(),
  }),
]);

const skillLevelBaselineSchema = z.enum(["raceStarting", "skillFloor"]);

const skillFloorSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("raceStarting") }),
  z.object({
    type: z.literal("selectedSkillBonus"),
    selection: z.enum(["major", "minor"]),
    bonusField: z.enum(["majorSkillBonus", "minorSkillBonus"]),
  }),
]);

export const manifestSchema = z.object({
  version: z.string(),
  name: z.string(),
  limits: z.object({
    majorSkills: z.number(),
    minorSkills: z.number(),
    traits: z.number(),
    initialAttributePoints: z.number(),
  }),
  nonAllocatableSkills: z.array(z.string()).default([]),
  skills: z.array(z.string()),
});

const skillLevelCostTierSchema = z.object({
  minLevel: z.number().int().positive(),
  maxLevel: z.number().int().positive(),
  cost: z.number().int().positive(),
});

export const mechanicsSchema = z
  .object({
    leveling: z.object({
      baseLevel: z.number(),
      maxPlayerLevel: z.number().int().positive(),
      standardMaxPlayerLevel: z.number().int().positive(),
      maxSkillLevel: z.number().int().positive(),
      skillPointsPerLevel: z.number().int().positive(),
      perkPointsPerLevel: z.number().int().positive(),
      initialPerkPoints: z.number().int().nonnegative(),
      maxSkillAbovePlayerLevel: z.number().int().positive(),
      maxTrainingSkillLevel: z.number().int().positive(),
      skillLevelIncreasesPerPlayerLevel: z.number().int().positive(),
      skillPointBaseline: skillLevelBaselineSchema,
      playerLevelSkillBaseline: skillLevelBaselineSchema,
      skillPointFreeThroughFloor: z.boolean(),
      skillFloorSources: z.array(skillFloorSourceSchema).min(1),
      skillLevelCosts: z.array(skillLevelCostTierSchema).min(1),
      attributePointsPerLevel: z.tuple([z.number(), z.number(), z.number()]),
    }),
    oghmaInfinium: z
      .object({
        perkPoints: z.number(),
        attributeBonus: z.tuple([z.number(), z.number(), z.number()]),
        freeSkillLevels: z.number().optional(),
        maxSkills: z.number().optional(),
      })
      .optional(),
    majorSkillBonus: z.number(),
    minorSkillBonus: z.number(),
    derivedStats: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        isPercent: z.boolean(),
        prefactor: z.number(),
        threshold: z.number(),
        weights: z.object({
          health: z.number(),
          magicka: z.number(),
          stamina: z.number(),
        }),
      }),
    ),
  })
  .superRefine((mechanics, ctx) => {
    const {
      maxSkillLevel,
      maxTrainingSkillLevel,
      maxPlayerLevel,
      standardMaxPlayerLevel,
      skillLevelCosts,
    } = mechanics.leveling;
    const tierMax = Math.max(...skillLevelCosts.map((tier) => tier.maxLevel));
    if (maxSkillLevel < tierMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `leveling.maxSkillLevel (${maxSkillLevel}) must be >= highest skillLevelCosts tier (${tierMax})`,
        path: ["leveling", "maxSkillLevel"],
      });
    }
    if (maxTrainingSkillLevel > maxSkillLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `leveling.maxTrainingSkillLevel (${maxTrainingSkillLevel}) must be <= maxSkillLevel (${maxSkillLevel})`,
        path: ["leveling", "maxTrainingSkillLevel"],
      });
    }
    if (standardMaxPlayerLevel > maxPlayerLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `leveling.standardMaxPlayerLevel (${standardMaxPlayerLevel}) must be <= maxPlayerLevel (${maxPlayerLevel})`,
        path: ["leveling", "standardMaxPlayerLevel"],
      });
    }
  });

const characterOptionControlTypeSchema = z.enum(["select", "toggle", "buttons"]);

const characterOptionChoiceSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    effects: z.array(effectSchema).optional(),
  });

export const characterOptionSchema = z
  .object({
    id: z.string(),
    titleLabel: z.string(),
    descriptionLabel: z.string().optional(),
    defaultChoice: z.string(),
    extension: z.string().optional(),
    controlType: characterOptionControlTypeSchema.optional(),
    choices: z.array(characterOptionChoiceSchema).min(1),
  })
  .superRefine((option, ctx) => {
    const choiceIds = new Set<string>();
    for (const choice of option.choices) {
      if (choiceIds.has(choice.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate choice id: ${choice.id}`,
          path: ["choices"],
        });
      }
      choiceIds.add(choice.id);
    }

    if (!choiceIds.has(option.defaultChoice)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `defaultChoice "${option.defaultChoice}" is not a valid choice id`,
        path: ["defaultChoice"],
      });
    }
  });

export const characterOptionsSchema = z.object({
  options: z.array(characterOptionSchema),
});

const statValueKindSchema = z.enum(["flat", "percent", "flag"]);

const statDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.string(),
  valueKind: statValueKindSchema,
});

const raceBindingSchema = z.object({
  field: z.enum(["unarmedDamage", "speedBonus"]),
});

export const statsSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
    }),
  ),
  stats: z.array(statDefinitionSchema),
  raceBindings: z.record(z.string(), raceBindingSchema),
});

export const raceEffectsSchema = z.record(z.string(), z.array(effectSchema));

export const raceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bonuses: z.array(z.string()),
  startingAttributes: z.object({
    health: z.number(),
    magicka: z.number(),
    stamina: z.number(),
  }),
  attributeBonus: z.object({
    health: z.number(),
    magicka: z.number(),
    stamina: z.number(),
  }),
  startingCarryWeight: z.number(),
  speedBonus: z.number(),
  unarmedDamage: z.number(),
  regen: z.object({
    health: z.number(),
    magicka: z.number(),
    stamina: z.number(),
  }),
  startingSkills: z.record(z.string(), z.number()),
  effects: z.array(effectSchema),
});

export const racesSchema = z.object({
  races: z.array(raceSchema),
});

export const birthsignSchema = z.object({
  id: z.string(),
  name: z.string(),
  group: z.string(),
  description: z.string(),
  bonus: z.string(),
  bonusDetails: z.array(z.string()).optional(),
  effects: z.array(effectSchema),
});

export const birthsignsSchema = z.object({
  birthsigns: z.array(birthsignSchema),
});

export const deitySchema = z.object({
  id: z.string(),
  name: z.string(),
  shrine: z.string(),
  follower: z.string(),
  devotee: z.string(),
  tenets: z.string(),
  race: z.string(),
  starting: z.string(),
  requirement: z.string(),
  shrineLocations: z.array(z.string()).default([]),
  effects: z.array(effectSchema),
});

export const deitiesSchema = z.object({
  deities: z.array(deitySchema),
});

export const traitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bonus: z.string(),
  bonusDetails: z.array(z.string()).optional(),
  effects: z.array(effectSchema),
});

export const traitsSchema = z.object({
  traits: z.array(traitSchema),
});

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  majorEligible: z.boolean(),
  minorEligible: z.boolean(),
});

export const skillsSchema = z.object({
  skills: z.array(skillSchema),
});

export const perkPlayerLevelReqsSchema = z.record(z.string(), z.number().int().positive());

export const perkSchema = z.object({
  id: z.string(),
  name: z.string(),
  skillReq: z.number(),
  playerLevelReq: z.number().int().positive().optional(),
  costsPerkPoint: z.boolean().default(true),
  /**
   * Optional allocation model for perks that can be selected multiple times.
   *
   * The planner stores multiple allocations by repeating the perk id in
   * `BuildState.selectedPerkIds`.
   */
  allocation: z
    .object({
      kind: z.literal("perkPointsBudget"),
      /** Denominator shown in rank badges: literal `X` or infinity (`∞`). */
      totalLabel: z.enum(["X", "infinity"]).optional(),
    })
    .optional(),
  position: z.object({ x: z.number().int(), y: z.number().int() }),
  prerequisites: z.array(z.string()),
  prerequisitesAny: z.array(z.string()).optional(),
  description: z.string(),
  effects: z.array(effectSchema),
  extension: z.string().optional(),
});

export const perkTreeSchema = z
  .object({
    skillId: z.string(),
    skillName: z.string(),
    grid: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    perks: z.array(perkSchema),
  })
  .superRefine((tree, ctx) => {
    for (const [index, perk] of tree.perks.entries()) {
      if (perk.position.x < 0 || perk.position.x >= tree.grid.width) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Perk "${perk.id}" x (${perk.position.x}) is outside grid width ${tree.grid.width}`,
          path: ["perks", index, "position", "x"],
        });
      }
      if (perk.position.y < 0 || perk.position.y >= tree.grid.height) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Perk "${perk.id}" y (${perk.position.y}) is outside grid height ${tree.grid.height}`,
          path: ["perks", index, "position", "y"],
        });
      }
    }
  });

export const perkIndexSchema = z.record(z.string(), z.string());

export const themeSchema = z.object({
  mode: z.enum(["dark", "light"]),
  colors: z.record(z.string(), z.string()),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  radius: z.record(z.string(), z.string()),
  shadows: z.record(z.string(), z.string()),
});

export const layoutSchema = z.object({
  columns: z.array(
    z.object({
      width: z.string(),
      panels: z.array(z.string()),
    }),
  ),
});

export const labelsSchema = z.object({
  app: z.object({
    title: z.string(),
    subtitle: z.string(),
    versionLabel: z.string(),
  }),
  nav: z.object({
    home: z.string(),
    planner: z.string(),
    builds: z.string(),
    reportBug: z.string(),
  }),
  landing: z.object({
    howItWorksTitle: z.string(),
    steps: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    ),
    featuresTitle: z.string(),
    features: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    ),
    recentBuildsTitle: z.string(),
    recentBuildsEmpty: z.string(),
    recentBuildsViewAll: z.string(),
    importTitle: z.string(),
    importDescription: z.string(),
    importPlaceholder: z.string(),
    importButton: z.string(),
  }),
  milestones: z.object({
    title: z.string(),
    fullBuild: z.string(),
    goalShort: z.string(),
    addStep: z.string(),
    addMilestone: z.string(),
    emptyHint: z.string(),
    viewingStep: z.string(),
    levelShort: z.string(),
    stepMeta: z.string(),
    manageStep: z.string(),
    manageVariants: z.string(),
    renameMilestone: z.string(),
    deleteMilestone: z.string(),
    saveRename: z.string(),
    cancelRename: z.string(),
  }),
  "level-bar": z.object({
    playerLevel: z.string(),
    perkPointsRemaining: z.string(),
    perkPointsSpent: z.string(),
    perkPointsInfo: z.string(),
    skillPointsRemaining: z.string(),
    skillPointsSpent: z.string(),
    skillPointsInfo: z.string(),
    trainingLevelsRemaining: z.string(),
    trainingLevelsSpent: z.string(),
    trainingLevelsInfo: z.string(),
    trainingOverBudgetAlert: z.string(),
    overBudget: z.string(),
    perkOverBudgetAlert: z.string(),
    destinyOverBudgetAlert: z.string(),
    skillOverBudgetAlert: z.string(),
    playerLevelSkillCapSingle: z.string(),
    playerLevelSkillCapMultiple: z.string(),
    playerLevelSkillIncreaseSingle: z.string(),
    playerLevelSkillIncreaseMultiple: z.string(),
    playerLevelPerkReqSingle: z.string(),
    playerLevelPerkReqMultiple: z.string(),
    skillReqConflictSingle: z.string(),
    skillReqConflictMultiple: z.string(),
    playerLevelWarningMixed: z.string(),
    playerLevelAttributeOverBudgetSingle: z.string(),
    playerLevelAttributeOverBudgetMultiple: z.string(),
    buildIssuesAlertMobile: z.string(),
    buildIssuesAlertDesktop: z.string(),
    buildIssuesAndMore: z.string(),
    setToMinimumLevel: z.string(),
    setToMinimumLevelInfo: z.string(),
    ensurePlayerLevel: z.string(),
    ensurePlayerLevelInfo: z.string(),
    easyModeLevelWarning: z.string(),
  }),
  panels: z.record(z.string(), z.record(z.string(), z.string())),
  errors: z.record(z.string(), z.string()),
});

export type AttributeStat = z.infer<typeof attributeStatSchema>;
export type SkillLevelBaseline = z.infer<typeof skillLevelBaselineSchema>;
export type SkillFloorSource = z.infer<typeof skillFloorSourceSchema>;
export type Effect = z.infer<typeof effectSchema>;
export type StatDefinition = z.infer<typeof statDefinitionSchema>;
export type StatsCatalog = z.infer<typeof statsSchema>;
export type RaceEffectsMap = z.infer<typeof raceEffectsSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type Mechanics = z.infer<typeof mechanicsSchema>;
export type CharacterOption = z.infer<typeof characterOptionSchema>;
export type CharacterOptionChoice = z.infer<typeof characterOptionChoiceSchema>;
export type Race = z.infer<typeof raceSchema>;
export type Birthsign = z.infer<typeof birthsignSchema>;
export type Deity = z.infer<typeof deitySchema>;
export type Trait = z.infer<typeof traitSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Perk = z.infer<typeof perkSchema>;
export type PerkTree = z.infer<typeof perkTreeSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type Labels = z.infer<typeof labelsSchema>;

export interface GameData {
  manifest: Manifest;
  mechanics: Mechanics;
  stats: StatsCatalog;
  characterOptions: CharacterOption[];
  races: Race[];
  birthsigns: Birthsign[];
  deities: Deity[];
  traits: Trait[];
  skills: Skill[];
  perkTrees: Record<string, PerkTree>;
}

export interface UiData {
  theme: Theme;
  layout: Layout;
  labels: Labels;
}

export interface AppData {
  game: GameData;
  ui: UiData;
}
