// TODO: replace with real DAN OAuth2 call when credentials are available.
// Docs: https://dan.gov.mn/api (requires DAN_CLIENT_ID + DAN_CLIENT_SECRET)

export interface DANResult {
  success: boolean
  registernumber?: string   // e.g. "УУ90121234"
  firstname?: string        // e.g. "УУ"
  lastname?: string         // e.g. "Болд"
  fullName?: string         // legacy — derived from firstname + lastname
  error?: string
}

const MOCK_IDENTITIES = [
  { firstname: 'БАТ',   lastname: 'ДОРЖ',   suffix: 'БД' },
  { firstname: 'ГАН',   lastname: 'БОЛД',   suffix: 'ГБ' },
  { firstname: 'ТЭМҮР', lastname: 'МОНГОЛ', suffix: 'ТМ' },
  { firstname: 'НАРАН', lastname: 'ОЮУ',    suffix: 'НО' },
]

export async function mockDANVerification(_phone: string): Promise<DANResult> {
  await delay(1000 + Math.random() * 1000)

  if (Math.random() < 0.1) {
    return { success: false, error: 'ДАН системтэй холбогдоход алдаа гарлаа. Дахин оролдоно уу.' }
  }

  const identity = MOCK_IDENTITIES[Math.floor(Math.random() * MOCK_IDENTITIES.length)]!
  const year = String(70 + Math.floor(Math.random() * 30)).padStart(2, '0')
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')
  const day   = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
  const seq   = String(Math.floor(1000 + Math.random() * 9000))
  const registernumber = `${identity.suffix}${year}${month}${day}${seq}`

  return {
    success: true,
    registernumber,
    firstname: identity.firstname,
    lastname:  identity.lastname,
    fullName:  `${identity.lastname} ${identity.firstname}`,
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
