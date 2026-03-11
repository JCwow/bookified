import { z } from 'zod';

import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  DEFAULT_VOICE,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  voiceCategories,
} from '@/lib/constants';

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
  pdfFile: z.instanceof(File, {message: 'PDF file is required'})
    .refine((file) => file.size <= MAX_FILE_SIZE, "File size must be less than 50MB")
    .refine((file) => ACCEPTED_PDF_TYPES.includes(file.type), 'Only PDF files are accepted'),
  coverImage: z.instanceof(File).optional()
    .refine((file) => !file || file.size <= MAX_IMAGE_SIZE, 'Image size must be less than 10MB')
    .refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), 'Only .jpg, .jpeg, png and .webp formats are supported'),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(100, 'Title is too long.'),
  author: z
    .string()
    .trim()
    .min(1, 'Author name is required.')
    .max(100, 'Author name is too long.'),
  persona: z.string().min(1, 'Please select a voice')
});

export type UploadSchemaInput = z.input<typeof UploadSchema>;
export type UploadSchemaValues = z.infer<typeof UploadSchema>;
