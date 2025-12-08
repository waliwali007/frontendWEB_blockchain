// utils/walletUtils.js
import { ethers } from 'ethers';

export const generateWallets = (count = 3) => {
  return Array.from({ length: count }, (_, i) => {
    const wallet = ethers.Wallet.createRandom();
    return {
      id: `key${i + 1}`,
      address: wallet.address,
      privateKey: wallet.privateKey,
      wallet
    };
  });
};

export const recreateWalletsFromBackup = (backupData) => {
  if (!Array.isArray(backupData) || backupData.length !== 3) {
    throw new Error('Format de fichier invalide. 3 wallets requis.');
  }

  return backupData.map(w => {
    const wallet = new ethers.Wallet(w.privateKey);
    return {
      id: w.id,
      address: w.address,
      privateKey: w.privateKey,
      wallet
    };
  });
};

export const exportWalletsToFile = (wallets) => {
  const data = wallets.map(w => ({
    id: w.id,
    address: w.address,
    privateKey: w.privateKey
  }));
  const dataStr = JSON.stringify(data, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const link = document.createElement('a');
  link.setAttribute('href', dataUri);
  link.setAttribute('download', 'wallets-backup.json');
  link.click();
};