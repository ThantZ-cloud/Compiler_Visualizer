export interface Member {
  key: string;
  name: string;
  roleKey: 'leader' | 'coLeader' | 'member';
  roll: string;
  telegram: string;
  email: string;
  photo: string;
  initials: string;
}

export const MEMBERS: Member[] = [
  {
    key: 'thant',
    name: 'Mg Thant Zin Htun',
    roleKey: 'leader',
    roll: '3IST-2',
    telegram: 'ThantZ44',
    email: 'thantz6745@gmail.com',
    photo: '/photos/thant-zin-htun.png',
    initials: 'TZ',
  },
  {
    key: 'phyoLin',
    name: 'Mg Phyo Lin Mg',
    roleKey: 'member',
    roll: '3IST-69',
    telegram: 'Lyd_mai',
    email: 'phyolinn5423@gmail.com',
    photo: '/photos/phyo-lin-mg.jpg',
    initials: 'PL',
  },
  {
    key: 'phyoThin',
    name: 'Ma Phyo Thin Kyi',
    roleKey: 'coLeader',
    roll: '3IST-6',
    telegram: 'isagi_11_2005',
    email: 'phyothinkyi.mt@gmail.com',
    photo: '/photos/phyo-thin-kyi.jpg',
    initials: 'PT',
  },
  {
    key: 'lynn',
    name: 'Ma Lynn Latt Nwe',
    roleKey: 'member',
    roll: '3IST-4',
    telegram: 'L23232525',
    email: 'yinthetnwe23@gmail.com',
    photo: '/photos/lynn-latt-nwe.jpg',
    initials: 'LL',
  },
  {
    key: 'hmone',
    name: 'Ma Hmone Hmone Smile',
    roleKey: 'member',
    roll: '3IST-65',
    telegram: 'Emiko205',
    email: 's06398475@gmail.com',
    photo: '/photos/hmone-hmone-smile.jpg',
    initials: 'HS',
  },
];
