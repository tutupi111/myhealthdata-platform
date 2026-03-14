/**
 * Mock data for admin portal. No API, no auth, no database.
 */

export type UserStatus = "active" | "pending" | "disabled";
export type ResearcherReviewStatus = "pending" | "approved" | "rejected";
export type ProjectStatus = "draft" | "published" | "closed";
export type ConsentStatus = "active" | "expired" | "revoked";
export type RecordReviewStatus = "pending" | "approved" | "rejected";

/** 患者管理列表：DID、脱敏姓名、疾病类型、状态、注册时间 */
export interface MockAdminPatient {
  id: string;
  did: string;
  nameMasked: string;
  diseaseType: string;
  status: UserStatus;
  registeredAt: string;
}

/** 研究者管理列表 */
export interface MockAdminResearcher {
  id: string;
  fullName: string;
  organization: string;
  status: UserStatus;
  reviewStatus: ResearcherReviewStatus;
  registeredAt: string;
}

/** 项目管理列表（与研究者端项目一致，管理员视角） */
export interface MockAdminProject {
  id: string;
  title: string;
  organization: string;
  diseaseType: string;
  status: ProjectStatus;
  createdAt: string;
}

/** 资料审核列表 */
export interface MockAdminRecord {
  id: string;
  patientDid: string;
  recordType: string;
  title: string;
  uploadedAt: string;
  reviewStatus: RecordReviewStatus;
}

/** 授权记录列表 */
export interface MockAdminConsent {
  id: string;
  patientDid: string;
  projectTitle: string;
  authorizationScope: string[];
  status: ConsentStatus;
  authorizedAt: string;
}

/** 审计日志 */
export interface MockAuditLog {
  id: string;
  actorDisplay: string;
  actorRole: "patient" | "researcher" | "admin";
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export const MOCK_ADMIN_PATIENTS: MockAdminPatient[] = [
  {
    id: "p1",
    did: "did:ehf:cn:patient:8f4a2c91",
    nameMasked: "张**",
    diseaseType: "特发性肺纤维化",
    status: "active",
    registeredAt: "2023-08-15",
  },
  {
    id: "p2",
    did: "did:ehf:cn:patient:a1b2c3d4",
    nameMasked: "李**",
    diseaseType: "特发性肺纤维化",
    status: "active",
    registeredAt: "2024-01-20",
  },
];

export const MOCK_ADMIN_RESEARCHERS: MockAdminResearcher[] = [
  {
    id: "r1",
    fullName: "王医生",
    organization: "中国医学科学院呼吸病学研究所",
    status: "active",
    reviewStatus: "approved",
    registeredAt: "2023-09-01",
  },
  {
    id: "r2",
    fullName: "赵研究员",
    organization: "北京协和医院",
    status: "active",
    reviewStatus: "approved",
    registeredAt: "2023-10-10",
  },
  {
    id: "r3",
    fullName: "刘医生",
    organization: "上海肺科医院",
    status: "active",
    reviewStatus: "pending",
    registeredAt: "2024-02-05",
  },
];

export const MOCK_ADMIN_PROJECTS: MockAdminProject[] = [
  {
    id: "s1",
    title: "特发性肺纤维化真实世界研究",
    organization: "中国医学科学院呼吸病学研究所",
    diseaseType: "特发性肺纤维化",
    status: "published",
    createdAt: "2023-11-01",
  },
  {
    id: "s2",
    title: "IPF 患者长期随访与生活质量研究",
    organization: "北京协和医院",
    diseaseType: "特发性肺纤维化",
    status: "published",
    createdAt: "2023-12-15",
  },
  {
    id: "s3",
    title: "肺纤维化生物标志物探索研究",
    organization: "上海肺科医院",
    diseaseType: "特发性肺纤维化",
    status: "closed",
    createdAt: "2023-10-20",
  },
];

export const MOCK_ADMIN_RECORDS: MockAdminRecord[] = [
  {
    id: "rec1",
    patientDid: "did:ehf:cn:patient:8f4a2c91",
    recordType: "出院小结",
    title: "2024年1月住院小结",
    uploadedAt: "2024-01-20",
    reviewStatus: "approved",
  },
  {
    id: "rec2",
    patientDid: "did:ehf:cn:patient:8f4a2c91",
    recordType: "检查报告",
    title: "胸部高分辨率CT",
    uploadedAt: "2024-01-12",
    reviewStatus: "approved",
  },
  {
    id: "rec3",
    patientDid: "did:ehf:cn:patient:a1b2c3d4",
    recordType: "门诊记录",
    title: "呼吸科门诊",
    uploadedAt: "2024-02-14",
    reviewStatus: "pending",
  },
];

export const MOCK_ADMIN_CONSENTS: MockAdminConsent[] = [
  {
    id: "c1",
    patientDid: "did:ehf:cn:patient:8f4a2c91",
    projectTitle: "特发性肺纤维化真实世界研究",
    authorizationScope: ["出院小结", "检查报告", "用药记录"],
    status: "active",
    authorizedAt: "2024-01-25",
  },
  {
    id: "c2",
    patientDid: "did:ehf:cn:patient:8f4a2c91",
    projectTitle: "IPF 患者长期随访与生活质量研究",
    authorizationScope: ["门诊记录", "检查报告"],
    status: "active",
    authorizedAt: "2024-02-10",
  },
];

export const MOCK_AUDIT_LOGS: MockAuditLog[] = [
  {
    id: "log1",
    actorDisplay: "张**",
    actorRole: "patient",
    action: "consent.create",
    targetType: "consent",
    targetId: "c2",
    createdAt: "2024-02-10T14:30:00Z",
    metadata: { projectId: "s2" },
  },
  {
    id: "log2",
    actorDisplay: "系统",
    actorRole: "admin",
    action: "record.review.approve",
    targetType: "health_record",
    targetId: "rec2",
    createdAt: "2024-01-15T09:00:00Z",
    metadata: null,
  },
  {
    id: "log3",
    actorDisplay: "王医生",
    actorRole: "researcher",
    action: "project.update",
    targetType: "research_project",
    targetId: "s1",
    createdAt: "2024-02-01T11:20:00Z",
    metadata: null,
  },
  {
    id: "log4",
    actorDisplay: "管理员",
    actorRole: "admin",
    action: "researcher.review.approve",
    targetType: "researcher_profile",
    targetId: "r2",
    createdAt: "2023-10-12T16:00:00Z",
    metadata: null,
  },
];

/** Dashboard 用统计（与 mock 一致） */
export const MOCK_ADMIN_STATS = {
  patientCount: MOCK_ADMIN_PATIENTS.length,
  researcherCount: MOCK_ADMIN_RESEARCHERS.length,
  projectCount: MOCK_ADMIN_PROJECTS.length,
  consentCount: MOCK_ADMIN_CONSENTS.length,
  userCount: MOCK_ADMIN_PATIENTS.length + MOCK_ADMIN_RESEARCHERS.length,
};
