const sharp = require('sharp');
const fs = require('fs');

async function buildBanner() {
  // Extract clean full banner from user mockup (at 1024x572, the banner is at 205, 108, 614, 139)
  // Let's upscale it smoothly with sharp
  const banner = await sharp('public/campaigns/target_halloween_mockup.png')
    .extract({ left: 205, top: 108, width: 614, height: 139 })
    .resize(1440, 326, { kernel: 'lanczos3' })
    .png({ quality: 95 })
    .toFile('public/campaigns/halloween_hero_banner.png');

  console.log('halloween_hero_banner.png generated:', banner);

  // Also extract only the right-hand side illustration (castle, moon, bats, fox with witch hat and pumpkin)
  // left: 475 to 819 -> width: 344
  const illustration = await sharp('public/campaigns/target_halloween_mockup.png')
    .extract({ left: 475, top: 108, width: 344, height: 139 })
    .resize(900, 360, { kernel: 'lanczos3' })
    .png({ quality: 95 })
    .toFile('public/campaigns/halloween_fox_castle.png');

  console.log('halloween_fox_castle.png generated:', illustration);
}

buildBanner().catch(console.error);
