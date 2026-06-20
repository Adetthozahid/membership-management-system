const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const roles = [
  ["Super Admin", "super-admin", "Full system access"],
  ["Admin", "admin", "Administrative operations access"],
  ["Accountant", "accountant", "Finance and payment management"],
  ["Committee Manager", "committee-manager", "Committee and governance management"],
  ["Content Manager", "content-manager", "Content publishing management"],
  ["Election Officer", "election-officer", "Election workflow management"],
  ["Member", "member", "Member self-service access"]
];

const permissions = [
  ["admin", "access", "Access admin area"],
  ["member", "access", "Access member area"],
  ["users", "read", "Read users"],
  ["users", "manage", "Manage users"],
  ["roles", "read", "Read roles and permissions"],
  ["roles", "manage", "Manage roles and permissions"],
  ["members", "read", "Read members"],
  ["members", "manage", "Manage members"],
  ["membership_types", "read", "Read membership types"],
  ["membership_types", "manage", "Manage membership types"],
  ["form_builder", "read", "Read dynamic registration forms"],
  ["form_builder", "manage", "Manage dynamic registration forms"],
  ["payments", "read", "Read payments"],
  ["payments", "manage", "Manage payments"],
  ["committees", "read", "Read committees"],
  ["committees", "manage", "Manage committees"],
  ["content", "read", "Read content"],
  ["content", "manage", "Manage content"],
  ["elections", "read", "Read elections"],
  ["elections", "manage", "Manage elections"],
  ["audit", "read", "Read audit logs"]
];

const rolePermissionMap = {
  "super-admin": permissions.map(([module, action]) => `${module}:${action}`),
  admin: [
    "admin:access",
    "users:read",
    "members:read",
    "members:manage",
    "membership_types:read",
    "membership_types:manage",
    "form_builder:read",
    "form_builder:manage",
    "payments:read",
    "committees:read",
    "content:read",
    "elections:read",
    "audit:read"
  ],
  accountant: ["admin:access", "members:read", "membership_types:read", "payments:read", "payments:manage"],
  "committee-manager": ["admin:access", "members:read", "committees:read", "committees:manage"],
  "content-manager": ["admin:access", "content:read", "content:manage"],
  "election-officer": ["admin:access", "members:read", "elections:read", "elections:manage"],
  member: ["member:access"]
};

const membershipTypes = [
  {
    id: "membership-regular",
    name: "Regular Member",
    code: "regular",
    description: "Default alumni membership for Sociology graduates.",
    renewalRequired: false,
    renewalFee: 0,
    renewalCycle: null,
    gracePeriodDays: 0,
    directoryVisibleWhenExpired: true,
    monthlyChandaRequired: false,
    monthlyChandaAmount: 0,
    active: true
  },
  {
    id: "membership-life",
    name: "Life Member",
    code: "life",
    description: "Lifetime alumni membership.",
    renewalRequired: false,
    renewalFee: 0,
    renewalCycle: null,
    gracePeriodDays: 0,
    directoryVisibleWhenExpired: true,
    monthlyChandaRequired: false,
    monthlyChandaAmount: 0,
    active: true
  }
];

const registrationSections = [
  {
    id: "registration-personal-details",
    title: "Personal Details",
    description: "Information used to verify and identify the applicant.",
    sortOrder: 1,
    fields: [
      { label: "Date of birth", key: "date_of_birth", placeholder: "Select date of birth", type: "date", required: true, sortOrder: 0 },
      {
        label: "Gender",
        key: "gender",
        placeholder: "Select gender",
        type: "radio",
        required: true,
        options: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
          { label: "Other", value: "other" }
        ],
        sortOrder: 1
      },
      {
        label: "Blood group",
        key: "blood_group",
        placeholder: "Select blood group",
        type: "dropdown",
        required: false,
        options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => ({ label: value, value })),
        sortOrder: 2
      },
      { label: "National ID / Birth certificate no.", key: "national_id", placeholder: "Enter NID or birth certificate number", type: "text", required: false, sortOrder: 3 },
      { label: "Present address", key: "present_address", placeholder: "Enter your present address", type: "textarea", required: true, sortOrder: 4 },
      { label: "Permanent address", key: "permanent_address", placeholder: "Enter your permanent address", type: "textarea", required: true, sortOrder: 5 }
    ]
  },
  {
    id: "registration-academic-details",
    title: "Academic Details",
    description: "SUST Sociology academic information.",
    sortOrder: 2,
    fields: [
      { label: "Registration number", key: "sust_registration_number", placeholder: "Enter SUST registration number", type: "text", required: true, sortOrder: 0 },
      { label: "Session", key: "session", placeholder: "Example: 2014-15", type: "text", required: true, sortOrder: 1 },
      { label: "Batch", key: "batch", placeholder: "Example: 25th batch", type: "text", required: true, sortOrder: 2 },
      { label: "Graduation year", key: "graduation_year", placeholder: "Example: 2019", type: "number", required: true, sortOrder: 3 },
      { label: "Highest degree from Sociology", key: "highest_degree", placeholder: "Example: MSS in Sociology", type: "text", required: true, sortOrder: 4 },
      { label: "Hall affiliation", key: "hall_affiliation", placeholder: "Enter hall name if applicable", type: "text", required: false, sortOrder: 5 }
    ]
  },
  {
    id: "registration-professional-details",
    title: "Professional Details",
    description: "Current professional and contact information.",
    sortOrder: 3,
    fields: [
      { label: "Occupation", key: "occupation", placeholder: "Enter occupation", type: "text", required: false, sortOrder: 0 },
      { label: "Organization", key: "organization", placeholder: "Enter organization name", type: "text", required: false, sortOrder: 1 },
      { label: "Designation", key: "designation", placeholder: "Enter designation", type: "text", required: false, sortOrder: 2 },
      { label: "Office address", key: "office_address", placeholder: "Enter office address", type: "textarea", required: false, sortOrder: 3 },
      { label: "Alternative phone", key: "alternative_phone", placeholder: "Enter alternative phone number", type: "phone", required: false, sortOrder: 4 }
    ]
  },
  {
    id: "registration-membership-details",
    title: "Membership Details",
    description: "Preferred membership and alumni participation details.",
    sortOrder: 4,
    fields: [
      {
        label: "Preferred membership type",
        key: "preferred_membership_type",
        placeholder: "Select membership type",
        type: "dropdown",
        required: true,
        options: [
          { label: "Regular Member", value: "regular" },
          { label: "Life Member", value: "life" }
        ],
        sortOrder: 0
      },
      {
        label: "Interested areas",
        key: "interested_areas",
        placeholder: "Select areas where you want to contribute",
        type: "checkbox",
        required: false,
        options: [
          { label: "Events", value: "events" },
          { label: "Mentorship", value: "mentorship" },
          { label: "Fundraising", value: "fundraising" },
          { label: "Career support", value: "career_support" },
          { label: "Research network", value: "research_network" }
        ],
        sortOrder: 1
      },
      { label: "Reference / proposer", key: "reference_person", placeholder: "Enter reference name if any", type: "text", required: false, sortOrder: 2 },
      { label: "Additional note", key: "additional_note", placeholder: "Write any message for the association", type: "textarea", required: false, sortOrder: 3 }
    ]
  },
  {
    id: "registration-documents",
    title: "Photo & Documents",
    description: "Upload a recent photo and supporting documents.",
    sortOrder: 5,
    fields: [
      { label: "Profile photo", key: "profile_photo", placeholder: "Upload a recent passport-size photo", type: "image", required: true, helpText: "JPG or PNG image only.", sortOrder: 0 },
      { label: "NID / certificate copy", key: "identity_document", placeholder: "Upload supporting document", type: "document", required: false, helpText: "PDF, DOC, DOCX, JPG or PNG file.", sortOrder: 1 }
    ]
  },
  {
    id: "registration-social-links",
    title: "Social Links",
    description: "Optional public profile links shown on member cards.",
    sortOrder: 6,
    fields: [
      { label: "Website", key: "website_url", placeholder: "Personal website URL", type: "text", required: false, sortOrder: 0 },
      { label: "Facebook", key: "facebook_url", placeholder: "Facebook profile URL", type: "text", required: false, sortOrder: 1 },
      { label: "Instagram", key: "instagram_url", placeholder: "Instagram profile URL", type: "text", required: false, sortOrder: 2 },
      { label: "LinkedIn", key: "linkedin_url", placeholder: "LinkedIn profile URL", type: "text", required: false, sortOrder: 3 }
    ]
  },
  {
    id: "registration-declaration",
    title: "Declaration",
    description: "Confirm the application before submission.",
    sortOrder: 7,
    fields: [
      {
        label: "I confirm that the information provided is true and correct.",
        key: "information_declaration",
        type: "checkbox",
        required: true,
        options: [{ label: "I agree", value: "agree" }],
        sortOrder: 0
      }
    ]
  }
];

async function seedRegistrationForm() {
  await prisma.form.upsert({
    where: { code: "registration" },
    update: {
      name: "Registration",
      description: "Default public member registration form.",
      active: true,
      system: true
    },
    create: {
      id: "registration",
      name: "Registration",
      code: "registration",
      description: "Default public member registration form.",
      active: true,
      system: true
    }
  });

  for (const section of registrationSections) {
    const sectionRow = await prisma.formSection.upsert({
      where: { id: section.id },
      update: {
        formId: "registration",
        title: section.title,
        description: section.description,
        sortOrder: section.sortOrder,
        active: true
      },
      create: {
        id: section.id,
        formId: "registration",
        title: section.title,
        description: section.description,
        sortOrder: section.sortOrder,
        active: true
      }
    });

    for (const field of section.fields) {
      await prisma.formField.upsert({
        where: { key: field.key },
        update: {
          sectionId: sectionRow.id,
          label: field.label,
          placeholder: field.placeholder ?? null,
          helpText: field.helpText ?? null,
          type: field.type,
          required: field.required,
          publicVisible: true,
          memberEditable: true,
          adminOnly: false,
          membershipTypeSpecific: false,
          membershipTypeIds: null,
          validationRules: field.validationRules ?? null,
          options: field.options ?? null,
          active: true,
          sortOrder: field.sortOrder
        },
        create: {
          sectionId: sectionRow.id,
          label: field.label,
          key: field.key,
          placeholder: field.placeholder ?? null,
          helpText: field.helpText ?? null,
          type: field.type,
          required: field.required,
          publicVisible: true,
          memberEditable: true,
          adminOnly: false,
          membershipTypeSpecific: false,
          membershipTypeIds: null,
          validationRules: field.validationRules ?? null,
          options: field.options ?? null,
          active: true,
          sortOrder: field.sortOrder
        }
      });
    }
  }
}

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SUPER_ADMIN_NAME || "Super Admin";

  if (!email || !password) {
    throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required to seed the first Super Admin.");
  }

  const roleRecords = new Map();
  for (const [name, slug, description] of roles) {
    const role = await prisma.role.upsert({
      where: { slug },
      update: { name, description, isSystem: true },
      create: { name, slug, description, isSystem: true }
    });
    roleRecords.set(slug, role);
  }

  const permissionRecords = new Map();
  for (const [module, action, description] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { module_action: { module, action } },
      update: { description },
      create: { module, action, description }
    });
    permissionRecords.set(`${module}:${action}`, permission);
  }

  for (const [roleSlug, grants] of Object.entries(rolePermissionMap)) {
    const role = roleRecords.get(roleSlug);
    for (const grant of grants) {
      const permission = permissionRecords.get(grant);
      if (!role || !permission) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      fullName,
      passwordHash,
      isActive: true
    },
    create: {
      email: email.toLowerCase(),
      fullName,
      passwordHash,
      isActive: true
    }
  });

  const superAdminRole = roleRecords.get("super-admin");
  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId: {
        userId: superAdmin.id,
        roleId: superAdminRole.id
      }
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: superAdminRole.id
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      module: "auth",
      action: "seed_super_admin",
      entityType: "User",
      entityId: superAdmin.id
    }
  });

  for (const membershipType of membershipTypes) {
    await prisma.membershipType.upsert({
      where: { code: membershipType.code },
      update: {
        name: membershipType.name,
        description: membershipType.description,
        renewalRequired: membershipType.renewalRequired,
        renewalFee: membershipType.renewalFee,
        renewalCycle: membershipType.renewalCycle,
        gracePeriodDays: membershipType.gracePeriodDays,
        directoryVisibleWhenExpired: membershipType.directoryVisibleWhenExpired,
        monthlyChandaRequired: membershipType.monthlyChandaRequired,
        monthlyChandaAmount: membershipType.monthlyChandaAmount,
        active: membershipType.active
      },
      create: {
        id: membershipType.id,
        name: membershipType.name,
        code: membershipType.code,
        description: membershipType.description,
        renewalRequired: membershipType.renewalRequired,
        renewalFee: membershipType.renewalFee,
        renewalCycle: membershipType.renewalCycle,
        gracePeriodDays: membershipType.gracePeriodDays,
        directoryVisibleWhenExpired: membershipType.directoryVisibleWhenExpired,
        monthlyChandaRequired: membershipType.monthlyChandaRequired,
        monthlyChandaAmount: membershipType.monthlyChandaAmount,
        active: membershipType.active
      }
    });
  }

  await seedRegistrationForm();

  console.log(`Seeded roles, permissions, membership types, registration form, and Super Admin: ${email.toLowerCase()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
