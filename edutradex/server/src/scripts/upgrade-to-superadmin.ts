import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { query, queryOne } from '../config/db.js';

const userId = process.argv[2] || 'd415ca2a-fa12-4aa9-9b24-aba4bb71285e';

async function upgradeToSuperAdmin() {
  console.log('Upgrading user to SUPERADMIN...', userId);
  
  const result = await queryOne(`
    UPDATE "User" 
    SET role = 'SUPERADMIN', "isProtected" = true, "updatedAt" = NOW()
    WHERE id = $1
    RETURNING id, email, name, role, "isProtected"
  `, [userId]);
  
  if (result) {
    console.log('Successfully upgraded to SUPERADMIN!');
    console.log(result);
  } else {
    console.log('User not found');
  }
}

upgradeToSuperAdmin()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
