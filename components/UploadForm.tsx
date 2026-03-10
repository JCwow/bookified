'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import LoadingOverlay from '@/components/LoadingOverlay';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  DEFAULT_VOICE,
  voiceCategories,
  voiceOptions,
} from '@/lib/constant';
import { cn } from '@/lib/utils';
import {
  UploadSchema,
  type UploadSchemaInput,
  type UploadSchemaValues,
} from '@/lib/zod';

type FileFieldName = 'pdfFile' | 'coverImage';

type FileDropzoneFieldProps = {
  name: FileFieldName;
  label: string;
  placeholder: string;
  hint: string;
  accept: string[];
  icon: typeof Upload;
  disabled: boolean;
  form: UseFormReturn<UploadSchemaInput, unknown, UploadSchemaValues>;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

const FileDropzoneField = ({
  name,
  label,
  placeholder,
  hint,
  accept,
  icon: Icon,
  disabled,
  form,
  inputRef,
}: FileDropzoneFieldProps) => {
  const selectedFile = form.watch(name);

  const openPicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    form.setValue(name, file, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const clearFile = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    form.setValue(name, undefined, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel className="form-label">{label}</FormLabel>
          <FormControl>
            <div
              className={cn(
                'upload-dropzone',
                selectedFile && 'upload-dropzone-uploaded',
                disabled && 'cursor-not-allowed opacity-70',
              )}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={openPicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openPicker();
                }
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept={accept.join(',')}
                className="sr-only"
                onChange={handleFileChange}
                disabled={disabled}
              />

              <Icon className="upload-dropzone-icon" />
              <p className="upload-dropzone-text">
                {selectedFile ? selectedFile.name : placeholder}
              </p>
              <p className="upload-dropzone-hint">
                {selectedFile ? 'File selected and ready to upload.' : hint}
              </p>

              {selectedFile ? (
                <button
                  type="button"
                  className="upload-dropzone-remove"
                  onClick={clearFile}
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UploadSchemaInput, unknown, UploadSchemaValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: {
      pdfFile: undefined,
      coverImage: undefined,
      title: '',
      author: '',
      voice: DEFAULT_VOICE,
    },
  });

  const submitUpload = async (values: UploadSchemaValues) => {
    const formData = new FormData();

    formData.append('pdfFile', values.pdfFile);

    if (values.coverImage) {
      formData.append('coverImage', values.coverImage);
    }

    formData.append('title', values.title);
    formData.append('author', values.author);
    formData.append('voice', values.voice);

    // Preserve the current placeholder behavior until the real upload endpoint is wired in.
    await new Promise((resolve) => setTimeout(resolve, 1200));
  };

  const onSubmit = async (values: UploadSchemaValues) => {
    setIsSubmitting(true);

    try {
      await submitUpload(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoadingOverlay isVisible={isSubmitting} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="new-book-wrapper">
          <FileDropzoneField
            name="pdfFile"
            label="Book PDF File"
            placeholder="Click to upload PDF"
            hint="PDF file (max 50MB)"
            accept={ACCEPTED_PDF_TYPES}
            icon={Upload}
            disabled={isSubmitting}
            form={form}
            inputRef={pdfInputRef}
          />

          <FileDropzoneField
            name="coverImage"
            label="Cover Image (Optional)"
            placeholder="Click to upload cover image"
            hint="Leave empty to auto-generate from PDF"
            accept={ACCEPTED_IMAGE_TYPES}
            icon={ImageIcon}
            disabled={isSubmitting}
            form={form}
            inputRef={coverInputRef}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Title</FormLabel>
                <FormControl>
                  <input
                    {...field}
                    type="text"
                    placeholder="ex: Rich Dad Poor Dad"
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Author Name</FormLabel>
                <FormControl>
                  <input
                    {...field}
                    type="text"
                    placeholder="ex: Robert Kiyosaki"
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="voice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Choose Assistant Voice</FormLabel>
                <FormControl>
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <p className="form-label mb-0 text-sm text-(--text-secondary)">
                        Male Voices
                      </p>
                      <div className="voice-selector-options">
                        {voiceCategories.male.map((voiceKey) => {
                          const voice = voiceOptions[voiceKey as keyof typeof voiceOptions];
                          const selected = field.value === voiceKey;

                          return (
                            <label
                              key={voiceKey}
                              className={cn(
                                'voice-selector-option',
                                selected
                                  ? 'voice-selector-option-selected'
                                  : 'voice-selector-option-default',
                                isSubmitting && 'voice-selector-option-disabled',
                              )}
                            >
                              <input
                                type="radio"
                                name={field.name}
                                value={voiceKey}
                                checked={selected}
                                onChange={() => field.onChange(voiceKey)}
                                disabled={isSubmitting}
                              />
                              <div>
                                <p className="font-semibold text-[#212a3b]">{voice.name}</p>
                                <p className="text-sm text-(--text-secondary)">
                                  {voice.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="form-label mb-0 text-sm text-(--text-secondary)">
                        Female Voices
                      </p>
                      <div className="voice-selector-options">
                        {voiceCategories.female.map((voiceKey) => {
                          const voice = voiceOptions[voiceKey as keyof typeof voiceOptions];
                          const selected = field.value === voiceKey;

                          return (
                            <label
                              key={voiceKey}
                              className={cn(
                                'voice-selector-option',
                                selected
                                  ? 'voice-selector-option-selected'
                                  : 'voice-selector-option-default',
                                isSubmitting && 'voice-selector-option-disabled',
                              )}
                            >
                              <input
                                type="radio"
                                name={field.name}
                                value={voiceKey}
                                checked={selected}
                                onChange={() => field.onChange(voiceKey)}
                                disabled={isSubmitting}
                              />
                              <div>
                                <p className="font-semibold text-[#212a3b]">{voice.name}</p>
                                <p className="text-sm text-(--text-secondary)">
                                  {voice.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <button type="submit" className="form-btn" disabled={isSubmitting}>
            Begin Synthesis
          </button>
        </form>
      </Form>
    </>
  );
};

export default UploadForm;