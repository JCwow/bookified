import { z } from 'zod';

import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  DEFAULT_VOICE,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  voiceCategories,
} from '@/lib/constant';

const voiceKeys = [...voiceCategories.male, ...voiceCategories.female] as [string, ...string[]];

const requiredFile = (label: string, acceptedTypes: string[], maxSize: number) =>
  z
    .custom<File>((value) => value instanceof File, {
      message: `${label} is required.`,
    })
    .refine((file) => acceptedTypes.includes(file.type), {
      message: `Please upload a valid ${label.toLowerCase()}.`,
    })
    .refine((file) => file.size <= maxSize, {
      message: `${label} must be ${Math.round(maxSize / (1024 * 1024))}MB or smaller.`,
    });

const optionalFile = (label: string, acceptedTypes: string[], maxSize: number) =>
  z
    .custom<File | undefined>((value) => value === undefined || value instanceof File)
    .refine((file) => !file || acceptedTypes.includes(file.type), {
      message: `Please upload a valid ${label.toLowerCase()}.`,
    })
    .refine((file) => !file || file.size <= maxSize, {
      message: `${label} must be ${Math.round(maxSize / (1024 * 1024))}MB or smaller.`,
    })
    .optional();

export const UploadSchema = z.object({
  pdfFile: requiredFile('PDF file', ACCEPTED_PDF_TYPES, MAX_FILE_SIZE),
  coverImage: optionalFile('cover image', ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(120, 'Title must be 120 characters or fewer.'),
  author: z
    .string()
    .trim()
    .min(1, 'Author name is required.')
    .max(120, 'Author name must be 120 characters or fewer.'),
  voice: z.enum(voiceKeys).default(DEFAULT_VOICE),
});

export type UploadSchemaInput = z.input<typeof UploadSchema>;
export type UploadSchemaValues = z.infer<typeof UploadSchema>;
