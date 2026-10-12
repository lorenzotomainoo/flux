export const MAX_POST_LENGTH = 500;
export const MAX_COMMENT_LENGTH = 300;
export const MAX_NAME_LENGTH = 40;
export const MAX_BIO_LENGTH = 160;
export const MAX_IMAGES_PER_POST = 4;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB, lo stesso limite dei bucket Supabase
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB, lo stesso limite del bucket "post-audio"
export const MAX_AUDIO_SECONDS = 180; // 3 minuti
