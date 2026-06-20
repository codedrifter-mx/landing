import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const experience = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
  schema: z.object({
    role: z.string(),
    company: z.string(),
    via: z.string().optional(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean().default(false),
    order: z.number(),
    bullets: z.array(z.string()),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(),
    subtitle: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    github: z.url(),
    role: z.string(),
    order: z.number(),
  }),
});

const talks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/talks' }),
  schema: z.object({
    title: z.string(),
    venue: z.string(),
    date: z.string(),
    audience: z.string(),
    order: z.number(),
  }),
});

const caseStudy = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/case-study' }),
  schema: z.object({
    title: z.string(),
    context: z.string(),
    approach: z.string(),
    built: z.array(z.string()),
    operations: z.string(),
    outcome: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { experience, projects, talks, caseStudy };
