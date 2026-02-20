const defaultEvents = [
  {
    id: 'evt_1',
    age: 30,
    type: 'lump',
    amount: 50000000,
    label: '초기 투자금'
  },
  {
    id: 'evt_2',
    age: 30,
    type: 'monthly',
    amount: 1500000,
    label: '월 분할 투자금'
  },
  {
    id: 'evt_3',
    age: 30,
    type: 'portfolio',
    presetId: 'preset_growth_40_dividend_60',
    weight: 10
  },
   {
    id: 'evt_4',
    age: 45,
    type: 'portfolio',
    presetId: 'preset_growth_20_dividend_80',
    weight: 10
  },
  {
    id: 'evt_5',
    age: 65,
    type: 'monthly',
    amount: 0, // 은퇴 후 납입 중단
    label: '은퇴'
  },
  {
    id: 'evt_6',
    age: 65,
    type: 'withdrawal',
    amount: 3000000,
    label: '은퇴 후 생활비'
  }
];