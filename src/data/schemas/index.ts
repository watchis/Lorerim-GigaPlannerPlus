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
]);

const skillLevelBaselineSchema = z.enum(["raceStarting"]);

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
      maxSkillLevel: z.number().int().positive(),
      skillPointsPerLevel: z.number().int().positive(),
      perkPointsPerLevel: z.number().int().positive(),
      initialPerkPoints: z.number().int().nonnegative(),
      maxSkillAbovePlayerLevel: z.number().int().positive(),
      skillPointBaseline: skillLevelBaselineSchema,
      playerLevelSkillBaseline: skillLevelBaselineSchema,
      skillPointFreeThroughFloor: z.boolean(),
      skillFloorSources: z.array(skillFloorSourceSchema).min(1),
      skillLevelCosts: z.array(skillLevelCostTierSchema).min(1),
      attributePointsPerLevel: z.tuple([z.number(), z.number(), z.number()]),
    }),
    oghmaInfinium: z.object({
      perkPoints: z.number(),
      attributeBonus: z.tuple([z.number(), z.number(), z.number()]),
    }),
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
    const { maxSkillLevel, skillLevelCosts } = mechanics.leveling;
    const tierMax = Math.max(...skillLevelCosts.map((tier) => tier.maxLevel));
    if (maxSkillLevel < tierMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `leveling.maxSkillLevel (${maxSkillLevel}) must be >= highest skillLevelCosts tier (${tierMax})`,
        path: ["leveling", "maxSkillLevel"],
      });
    }
  });

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

export const standingStoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  group: z.string(),
  description: z.string(),
  bonus: z.string(),
  bonusDetails: z.array(z.string()).optional(),
  effects: z.array(effectSchema),
});

export const standingStonesSchema = z.object({
  standingStones: z.array(standingStoneSchema),
});

export const blessingSchema = z.object({
  id: z.string(),
  name: z.string(),
  shrine: z.string(),
  follower: z.string(),
  devotee: z.string(),
  tenets: z.string(),
  race: z.string(),
  starting: z.string(),
  requirement: z.string(),
  effects: z.array(effectSchema),
});

export const blessingsSchema = z.object({
  blessings: z.array(blessingSchema),
});

export const traitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
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
  position: z.object({ x: z.number().int(), y: z.number().int() }),
  prerequisites: z.array(z.string()),
  prerequisitesAny: z.array(z.string()).optional(),
  description: z.string(),
  effects: z.array(effectSchema),
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
    footer: z.string(),
  }),
  nav: z.object({
    home: z.string(),
    planner: z.string(),
    builds: z.string(),
  }),
  landing: z.object({
    eyebrow: z.string(),
    headline: z.string(),
    description: z.string(),
    cta: z.string(),
    ctaHint: z.string(),
    feature1Title: z.string(),
    feature1Description: z.string(),
    feature2Title: z.string(),
    feature2Description: z.string(),
    feature3Title: z.string(),
    feature3Description: z.string(),
    feature4Title: z.string(),
    feature4Description: z.string(),
  }),
  planner: z.object({
    intro: z.string(),
  }),
  "level-bar": z.object({
    playerLevel: z.string(),
    perkPointsRemaining: z.string(),
    perkPointsSpent: z.string(),
    perkPointsPerLevel: z.string(),
    skillPointsRemaining: z.string(),
    skillPointsSpent: z.string(),
    skillPointsPerLevel: z.string(),
    overBudget: z.string(),
  }),
  panels: z.record(z.string(), z.record(z.string(), z.string())),
  errors: z.record(z.string(), z.string()),
});

export type SkillLevelBaseline = z.infer<typeof skillLevelBaselineSchema>;
export type SkillFloorSource = z.infer<typeof skillFloorSourceSchema>;
export type Effect = z.infer<typeof effectSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type Mechanics = z.infer<typeof mechanicsSchema>;
export type Race = z.infer<typeof raceSchema>;
export type StandingStone = z.infer<typeof standingStoneSchema>;
export type Blessing = z.infer<typeof blessingSchema>;
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
  races: Race[];
  standingStones: StandingStone[];
  blessings: Blessing[];
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
