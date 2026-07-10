export const COMPANY_PROFILE = {
  legalName: "OMNYZO AGENCY",
  brandName: "Omnyzo Agency",
  registrationNo: "202503336982 (MA0340342-V)",
  registeredOffice:
    "2003, The Sky Residensi, Jalan 6/91 Taman Shamelin Perkasa, 56100 Kuala Lumpur, Malaysia",
  email: "faiz.shamsul@omnyzo.com",
  billingEmail: "faiz.shamsul@omnyzo.com",
  currencyCode: "MYR",
  bankName: "MAYBANK BERHAD",
  bankAccountNo: "5144-0481-2701",
  swiftCode: "MBBEMYKL",
  sstRegistrationNo: "NA",
};

export function companyFooterText() {
  return `Company Registration No: ${COMPANY_PROFILE.registrationNo}. Registered Office: ${COMPANY_PROFILE.registeredOffice}. Email: ${COMPANY_PROFILE.email}`;
}
