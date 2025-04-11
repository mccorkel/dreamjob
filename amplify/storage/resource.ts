import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'amplifyStorage',
  access: (allow) => ({
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete'])
    ]
  })
}); 