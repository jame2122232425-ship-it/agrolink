import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';

interface FarmerAvatarProps {
  imageUrl?: string | null;
  initials: string;
  className: string;
}

export const FarmerAvatar: React.FC<FarmerAvatarProps> = ({
  imageUrl,
  initials,
  className,
}) => {
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let loadedObjectUrl: string | null = null;
    setImageObjectUrl(null);

    if (!imageUrl) {
      return () => {
        active = false;
      };
    }

    void apiService.fetchPrivateImage(imageUrl)
      .then((objectUrl) => {
        loadedObjectUrl = objectUrl;
        if (active) {
          setImageObjectUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch(() => {
        if (active) setImageObjectUrl(null);
      });

    return () => {
      active = false;
      if (loadedObjectUrl) URL.revokeObjectURL(loadedObjectUrl);
    };
  }, [imageUrl]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {imageObjectUrl ? (
        <img
          src={imageObjectUrl}
          alt="Profile picture"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
};
