'use server'
import Mux from '@mux/mux-node';
import { createClient } from '@/utils/supabase/server';

const getMux = () => new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function getUploadUrl() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const mux = getMux();
  const upload = await mux.video.uploads.create({
    new_asset_settings: { playback_policy: ['public'] },
    cors_origin: '*',
  });
  return { uploadUrl: upload.url, id: upload.id };
}