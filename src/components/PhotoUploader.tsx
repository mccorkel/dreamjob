import { useState, useEffect } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { Button, Card, Flex, Image, Text } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface Photo {
  id: string;
  uri: string;
  name: string;
}

export const PhotoUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const { data: photoData } = await client.models.Photo.list();
      setPhotos(photoData);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const key = `public/${Date.now()}-${file.name}`;
      const result = await uploadData({
        key,
        data: file,
        options: {
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              const progress = (transferredBytes / totalBytes) * 100;
              setUploadProgress(progress);
            }
          }
        }
      });

      await client.models.Photo.create({
        uri: key,
        name: file.name
      });

      await fetchPhotos();
      
      console.log('Upload successful:', result);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await client.models.Photo.delete({ id: photoId });
      await fetchPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={uploading}
        style={{ display: 'none' }}
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button
          as="span"
          isLoading={uploading}
          loadingText={`Uploading... ${Math.round(uploadProgress)}%`}
          style={{ 
            backgroundColor: '#0070f3',
            color: '#ffffff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Upload Photo
        </Button>
      </label>

      <Flex 
        wrap="wrap" 
        gap="small" 
        marginTop="medium"
        style={{ marginTop: '2rem' }}
      >
        {photos.map((photo) => (
          <Card 
            key={photo.id} 
            variation="outlined"
            style={{ 
              backgroundColor: '#2d2d2d',
              borderColor: '#404040',
              padding: '1rem'
            }}
          >
            <Image 
              src={photo.uri} 
              alt={photo.name} 
              width="200px" 
              style={{ borderRadius: '4px' }}
            />
            <Text 
              style={{ 
                color: '#ffffff',
                margin: '0.5rem 0'
              }}
            >
              {photo.name}
            </Text>
            <Button
              variation="destructive"
              size="small"
              onClick={() => handleDeletePhoto(photo.id)}
              style={{ 
                backgroundColor: '#dc3545',
                color: '#ffffff',
                border: 'none',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete
            </Button>
          </Card>
        ))}
      </Flex>
    </div>
  );
}; 