import { useState, useEffect } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { Button, Card, Flex, Image, Text } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface Photo {
  id: string;
  uri: string;
  name: string;
  owner: string | null;
}

const ProgressBar = ({ progress }: { progress: number }) => (
  <div style={{
    width: '100%',
    backgroundColor: '#2d2d2d',
    borderRadius: '4px',
    marginTop: '1rem',
    overflow: 'hidden'
  }}>
    <div
      style={{
        width: `${progress}%`,
        backgroundColor: '#0070f3',
        height: '4px',
        transition: 'width 0.3s ease-in-out'
      }}
    />
  </div>
);

export const PhotoUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  useEffect(() => {
    console.log('PhotoUploader component mounted, fetching photos...');
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    console.log('Starting photo fetch from database...');
    try {
      const response = await client.models.Photo.list();
      console.log('Raw database response:', response);

      if (response.data) {
        console.log('Successfully retrieved photos:', {
          count: response.data.length,
          photos: response.data.map(p => ({ 
            id: p.id, 
            name: p.name, 
            uri: p.uri,
            owner: p.owner
          }))
        });
        setPhotos(response.data);
      } else {
        console.error('No data returned from photo list query');
        setError('Failed to load photos');
      }
    } catch (error) {
      console.error('Error fetching photos from database:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      setError('Failed to load photos');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected for upload');
      return;
    }

    setCurrentFileName(file.name);
    setUploadProgress(0);
    setUploading(true);
    setError(null);

    console.log('Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    try {
      // Get current user
      const user = await getCurrentUser();
      const key = `public/${Date.now()}-${file.name}`;
      console.log('Generated S3 key for upload:', key);

      const result = await uploadData({
        key,
        data: file,
        options: {
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              const progress = (transferredBytes / totalBytes) * 100;
              setUploadProgress(progress);
              console.log('Upload progress:', {
                transferredBytes,
                totalBytes,
                progress: Math.round(progress)
              });
            }
          }
        }
      });

      console.log('File uploaded successfully to S3:', {
        key,
        result
      });

      console.log('Creating photo entity in database with owner:', user.userId);
      const createResponse = await client.models.Photo.create({
        uri: key,
        name: file.name,
        owner: user.userId
      });
      
      console.log('Database create response:', createResponse);

      if (createResponse.data) {
        console.log('Photo entity created:', {
          id: createResponse.data.id,
          uri: createResponse.data.uri,
          name: createResponse.data.name,
          owner: createResponse.data.owner
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Refreshing photos list...');
        await fetchPhotos();
      } else {
        console.error('Failed to create photo entity:', createResponse);
        setError('Failed to save photo information');
      }
      
    } catch (error) {
      console.error('Error during photo upload process:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        phase: uploading ? 'upload' : 'database'
      });
      setError('Failed to upload photo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentFileName(null);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    console.log('Attempting to delete photo:', { photoId });
    try {
      const deleteResponse = await client.models.Photo.delete({ id: photoId });
      console.log('Delete response:', deleteResponse);
      
      if (deleteResponse.data) {
        console.log('Successfully deleted photo:', { photoId });
        await fetchPhotos();
      } else {
        console.error('Failed to delete photo:', deleteResponse);
        setError('Failed to delete photo');
      }
    } catch (error) {
      console.error('Error deleting photo:', {
        photoId,
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      setError('Failed to delete photo');
    }
  };

  console.log('Rendering PhotoUploader with current state:', {
    uploading,
    uploadProgress,
    photoCount: photos.length,
    error
  });

  return (
    <div>
      {error && (
        <div style={{ 
          color: '#ff4444', 
          marginBottom: '1rem', 
          padding: '0.5rem', 
          backgroundColor: 'rgba(255,68,68,0.1)',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ marginBottom: '2rem' }}>
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
            loadingText="Uploading..."
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

        {uploading && currentFileName && (
          <div style={{ marginTop: '1rem' }}>
            <Text style={{ color: '#ffffff', marginBottom: '0.5rem' }}>
              Uploading {currentFileName} ({Math.round(uploadProgress)}%)
            </Text>
            <ProgressBar progress={uploadProgress} />
          </div>
        )}
      </div>

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
              onError={(e) => console.error('Error loading image:', {
                photoId: photo.id,
                uri: photo.uri,
                error: e
              })}
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