"use client";
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { Camera, Loader2 } from "lucide-react";

export default function AvatarUpload({
  uid,
  url,
  size = 150,
  onUpload,
}: {
  uid: string | null;
  url: string | null;
  size: number;
  onUpload: (url: string) => void;
}) {
  const supabase = createClient();
  const [avatarUrl, setAvatarUrl] = useState<
    string | null
  >(null);
  const [uploading, setUploading] =
    useState(false);

  const downloadImage = useCallback(
    async (path: string) => {
      try {
        const { data, error } =
          await supabase.storage
            .from("avatars")
            .download(path);
        if (error) {
          throw error;
        }
        const url = URL.createObjectURL(data);
        setAvatarUrl(url);
      } catch (error) {
        console.log(
          "Error downloading image: ",
          error,
        );
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (url) downloadImage(url);
  }, [url, downloadImage]);

  const uploadAvatar: React.ChangeEventHandler<
    HTMLInputElement
  > = async (event) => {
    try {
      setUploading(true);

      if (
        !event.target.files ||
        event.target.files.length === 0
      ) {
        throw new Error(
          "You must select an image to upload.",
        );
      }

      const file = event.target.files[0];
      const fileExt = file.name
        .split(".")
        .pop();
      const filePath = `${uid}-${Math.random()}.${fileExt}`;

      const { error: uploadError } =
        await supabase.storage
          .from("avatars")
          .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      onUpload(filePath);
    } catch (error) {
      alert("Error uploading avatar!");
      console.log(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <div
        style={{ width: size, height: size }}
        className="rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Avatar"
            width={size}
            height={size}
            className="avatar image w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="text-gray-400">
            <Camera size={size / 3} />
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition-colors">
        <label
          className="cursor-pointer flex items-center justify-center w-6 h-6"
          htmlFor="single"
        >
          <Camera
            size={16}
            className="text-gray-600"
          />
        </label>
        <input
          style={{
            visibility: "hidden",
            position: "absolute",
          }}
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </div>
    </div>
  );
}
