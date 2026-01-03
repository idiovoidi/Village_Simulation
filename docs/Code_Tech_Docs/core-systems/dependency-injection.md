# Dependency Injection

## Purpose

The Dependency Injection (DI) system manages service registration, resolution, and lifecycle. It enables loose coupling between systems by allowing dependencies to be injected rather than directly instantiated, improving testability and configurability.

## Boundaries

**In Scope:**
- Service registration (singleton, transient, scoped)
- Service resolution and instantiation
- Dependency graph management
- Lifecycle scoping (application, level, request)
- Circular dependency detection

**Out of Scope:**
- Service implementation details
- Business logic within services
- Configuration file parsing
- Runtime service replacement (hot-swapping)

## Responsibilities

- Register services with their dependencies
- Resolve services by type or token
- Manage service lifecycles based on scope
- Detect and report circular dependencies
- Dispose scoped services when scope ends
- Provide container hierarchy for nested scopes

## Core Concepts

### Service

A service is a class or factory that provides functionality to other parts of the system.

```
Service = {
  token: string | symbol,     // Unique identifier
  implementation: class | factory,
  scope: "singleton" | "transient" | "scoped",
  dependencies: token[]
}
```

### Container

A container holds service registrations and manages resolution:

```
Container = {
  registrations: Map<token, ServiceDefinition>,
  instances: Map<token, instance>,  // For singletons
  parent: Container | null          // For scoped containers
}
```

### Scope

Scopes determine service lifetime:

| Scope | Lifetime | Use Case |
|-------|----------|----------|
| Singleton | Application lifetime | Shared services (EventBus, ECS World) |
| Transient | Per-resolution | Stateless utilities, factories |
| Scoped | Per-scope lifetime | Level-specific services |

### Token

A token uniquely identifies a service for registration and resolution:

```
// String tokens
container.register("EventBus", EventBusImpl);
container.resolve("EventBus");

// Symbol tokens (preferred for type safety)
const EVENT_BUS = Symbol("EventBus");
container.register(EVENT_BUS, EventBusImpl);
container.resolve(EVENT_BUS);
```

## Lifecycle

### 1. Container Initialization
```
1. Create root container
2. Register core services (singletons)
3. Container ready for resolution
```

### 2. Service Registration
```
1. Define service token
2. Specify implementation (class or factory)
3. Declare dependencies (other tokens)
4. Specify scope
5. Add to container registrations
```

### 3. Service Resolution
```
1. Request service by token
2. Check for existing instance (singleton/scoped)
3. If no instance:
   a. Resolve all dependencies (recursive)
   b. Instantiate service with dependencies
   c. Store instance if singleton/scoped
4. Return service instance
```

### 4. Scope Creation
```
1. Create child container from parent
2. Child inherits parent registrations
3. Child can override with scoped registrations
4. Scoped services created in child container
```

### 5. Scope Disposal
```
1. Dispose all scoped service instances
2. Clear child container instances
3. Child container disposed
4. Parent container unaffected
```

## Registration Patterns

### Singleton Registration

```
// Service exists for application lifetime
container.registerSingleton("EventBus", EventBusImpl);

// All resolutions return same instance
const bus1 = container.resolve("EventBus");
const bus2 = container.resolve("EventBus");
// bus1 === bus2
```

### Transient Registration

```
// New instance per resolution
container.registerTransient("Logger", LoggerImpl);

// Each resolution creates new instance
const log1 = container.resolve("Logger");
const log2 = container.resolve("Logger");
// log1 !== log2
```

### Scoped Registration

```
// Instance per scope
container.registerScoped("LevelState", LevelStateImpl);

// Create scope for level
const levelScope = container.createScope();
const state1 = levelScope.resolve("LevelState");
const state2 = levelScope.resolve("LevelState");
// state1 === state2 (within same scope)

// Different scope gets different instance
const otherScope = container.createScope();
const state3 = otherScope.resolve("LevelState");
// state1 !== state3
```

### Factory Registration

```
// Custom instantiation logic
container.registerFactory("Config", (container) => {
  const env = container.resolve("Environment");
  return new Config(env.isDevelopment);
});
```

## Resolution Rules

### Resolution Order

```
1. Check current container for registration
2. If not found, check parent container (recursive)
3. If found, check for existing instance (singleton/scoped)
4. If no instance, resolve dependencies first
5. Instantiate service with resolved dependencies
6. Cache instance if singleton/scoped
7. Return instance
```

### Dependency Resolution

```
Registration:
  ServiceA depends on [ServiceB, ServiceC]
  ServiceB depends on [ServiceD]
  ServiceC depends on []
  ServiceD depends on []

Resolution of ServiceA:
1. Resolve ServiceB
   1.1 Resolve ServiceD → instantiate D
   1.2 Instantiate B with D
2. Resolve ServiceC → instantiate C
3. Instantiate A with B, C
```

### Circular Dependency Detection

```
Circular Dependency:
  ServiceA depends on [ServiceB]
  ServiceB depends on [ServiceA]  ← Circular!

Resolution of ServiceA:
1. Mark A as "resolving"
2. Resolve ServiceB
   2.1 Mark B as "resolving"
   2.2 Resolve ServiceA
   2.3 A is already "resolving" → ERROR!
```

## Scoping Rules

### Application Scope (Root Container)

```
┌─────────────────────────────────────────────────────────┐
│  Root Container (Application Scope)                      │
│                                                          │
│  Singletons:                                             │
│  - EventBus                                              │
│  - ECS World                                             │
│  - Game Loop                                             │
│  - Performance Monitor                                   │
└─────────────────────────────────────────────────────────┘
```

### Level Scope (Child Container)

```
┌─────────────────────────────────────────────────────────┐
│  Root Container                                          │
│  └─┬─────────────────────────────────────────────────┐  │
│    │  Level Scope (Child Container)                   │  │
│    │                                                   │  │
│    │  Inherits: EventBus, ECS World, etc.            │  │
│    │                                                   │  │
│    │  Scoped Services:                                │  │
│    │  - Level Configuration                           │  │
│    │  - Agent Spawner                                 │  │
│    │  - Environment State                             │  │
│    └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Scope Hierarchy

```
Application Start:
  Root Container created
  Core singletons registered

Level Load:
  Level Scope created (child of Root)
  Level-specific services registered
  Level services resolved

Level Unload:
  Level Scope disposed
  Scoped services disposed
  Root Container unaffected

Level Transition:
  Old Level Scope disposed
  New Level Scope created
  New level services resolved
```

## Semantics (Normative Guarantees)

### Registration Guarantees

- Registrations MUST be immutable after first resolution
- Duplicate registrations for same token MUST throw an error
- Registration MUST validate that dependencies are registered

### Resolution Guarantees

- Resolution MUST return the same instance for singletons
- Resolution MUST return the same instance for scoped services within a scope
- Resolution MUST return a new instance for transient services
- Resolution MUST throw if service is not registered
- Resolution MUST throw if circular dependency is detected

### Scope Guarantees

- Child scopes MUST inherit parent registrations
- Child scope resolutions MUST NOT affect parent instances
- Scope disposal MUST dispose all scoped service instances
- Scope disposal MUST call dispose() on services that implement it

### Lifecycle Guarantees

- Services MUST be instantiated lazily (on first resolution)
- Singleton services MUST NOT be disposed until container disposal
- Scoped services MUST be disposed when scope ends

## Observability

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Registration count | Total registered services | N/A (informational) |
| Resolution time | Time to resolve service | > 10ms |
| Scope count | Active child scopes | > 10 |
| Instance count | Cached service instances | > 100 |

### Events to Log

| Event | Level | Data |
|-------|-------|------|
| Service registered | Debug | token, scope |
| Service resolved | Trace | token, isNewInstance |
| Scope created | Debug | parentScope |
| Scope disposed | Debug | instanceCount |
| Circular dependency | Error | dependencyChain |
| Resolution failed | Error | token, reason |

## Cross-References

- #[[file:docs/Code_Tech_Docs/architecture-overview.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/level-system.md]]
- #[[file:docs/Code_Tech_Docs/patterns/error-handling.md]]
