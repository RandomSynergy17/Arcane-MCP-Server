/**
 * Shared type definitions for Arcane MCP Server tools.
 * These match the Arcane API response shapes.
 *
 * Extracted from individual tool files to prevent interface drift
 * and provide a single source of truth for API types.
 */

// === Containers ===

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: string;
  ports?: Array<{ privatePort: number; publicPort?: number; type: string }>;
  labels?: Record<string, string>;
}

// === Volumes ===

export interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  createdAt: string;
  labels?: Record<string, string>;
  options?: Record<string, string>;
  usageData?: { size: number; refCount: number };
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modTime: string;
  mode: string;
}

export interface Backup {
  id: string;
  volumeName: string;
  filename: string;
  size: number;
  createdAt: string;
}

// === Projects ===

export interface Project {
  id: string;
  name: string;
  status: string;
  path?: string;
  services: Array<{
    name: string;
    status: string;
    containerCount?: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// === Images ===

export interface Image {
  id: string;
  repoTags: string[];
  repoDigests?: string[];
  created: string;
  size: number;
  virtualSize?: number;
}

// === Image Updates ===

export interface ImageUpdateResponse {
  imageRef: string;
  currentDigest?: string;
  latestDigest?: string;
  updateAvailable: boolean;
  currentTag?: string;
  latestTag?: string;
}

export interface BatchImageUpdateResponse {
  results: Array<ImageUpdateResponse & { imageId: string }>;
  total: number;
  updatesAvailable: number;
}

export interface ImageUpdateSummary {
  totalImages: number;
  checkedImages: number;
  updatesAvailable: number;
  lastCheckedAt?: string;
}

// === Networks ===

export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
  internal: boolean;
  attachable: boolean;
  ipam?: {
    driver: string;
    config?: Array<{ subnet?: string; gateway?: string }>;
  };
  containers?: Record<string, { name: string; ipv4Address?: string }>;
  created?: string;
}

// === Network Topology ===

export interface TopologyNode {
  id: string;
  type: string;
  name: string;
  status?: string;
}

export interface TopologyEdge {
  source: string;
  target: string;
  type?: string;
}

export interface NetworkTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// === Environments ===

export interface Environment {
  id: string;
  name: string;
  apiUrl?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// === Builds ===

export interface Build {
  id: string;
  status: string;
  tag?: string;
  platform?: string;
  provider?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface BuildDetails extends Build {
  dockerfile?: string;
  gitUrl?: string;
  buildArgs?: Record<string, string>;
  logs?: string;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  size?: number;
  isDirectory: boolean;
  modifiedAt?: string;
}

// === Dashboard ===

export interface DashboardSnapshot {
  containers: { total: number; running: number; stopped: number };
  projects: { total: number; running: number; stopped: number };
  images: { total: number; updatesAvailable: number };
  volumes: { total: number; totalSize?: string };
  networks: { total: number };
  systemInfo?: { dockerVersion?: string; osType?: string; cpus?: number; memoryBytes?: number };
}

export interface ActionItem {
  type: string;
  severity: string;
  title: string;
  description?: string;
  resourceId?: string;
  resourceName?: string;
}

// === Events ===

export interface Event {
  id: string;
  type: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  userId?: string;
  username?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// === GitOps ===

export interface GitOpsSync {
  id: string;
  name: string;
  repositoryId: string;
  branch: string;
  path: string;
  targetProjectId?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  autoSync: boolean;
  syncInterval?: number;
}

export interface GitRepository {
  id: string;
  name: string;
  url: string;
  branch: string;
  authType: string;
  lastTestAt?: string;
  lastTestStatus?: string;
}

// === Jobs ===

export interface Job {
  id: string;
  name: string;
  type: string;
  status: string;
  lastRunAt?: string;
  nextRunAt?: string;
  schedule?: string;
  enabled: boolean;
}

// === Ports ===

export interface PortMapping {
  containerName: string;
  containerId: string;
  privatePort: number;
  publicPort?: number;
  protocol: string;
  ip?: string;
}

// === Registries ===

export interface ContainerRegistry {
  id: string;
  name: string;
  url: string;
  type: string;
  username?: string;
  createdAt?: string;
  lastTestAt?: string;
  lastTestStatus?: string;
}

// === Swarm ===

export interface SwarmService {
  id: string;
  name: string;
  image: string;
  replicas: number;
  desiredReplicas: number;
  ports?: Array<{ publishedPort: number; targetPort: number; protocol: string }>;
  updatedAt?: string;
  mode?: string;
}

export interface SwarmClusterInfo {
  id: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  managerCount: number;
  workerCount: number;
}

// === Templates ===

export interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  logo?: string;
  source?: string;
  createdAt?: string;
}

// === Updater ===

export interface UpdaterResult {
  updated: number;
  failed: number;
  skipped: number;
  results: Array<{
    containerId: string;
    containerName: string;
    status: string;
    message?: string;
  }>;
}

export interface UpdaterStatus {
  running: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  schedule?: string;
}

export interface UpdateRecord {
  id: string;
  containerName: string;
  oldImage: string;
  newImage: string;
  status: string;
  updatedAt: string;
}

// === Users ===

export interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  oidcSubject?: string;
}

// === Vulnerabilities ===

export interface ScanResult {
  imageId: string;
  imageRef: string;
  scannedAt: string;
  status: string;
  totalVulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Vulnerability {
  id: string;
  package: string;
  installedVersion: string;
  fixedVersion?: string;
  severity: string;
  title?: string;
  description?: string;
  ignored?: boolean;
}

// === Webhooks ===

export interface Webhook {
  id: string;
  name: string;
  url?: string;
  token?: string;
  enabled: boolean;
  events?: string[];
  createdAt?: string;
  lastTriggeredAt?: string;
}
