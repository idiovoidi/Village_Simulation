# ADR-004: State Machine Approach

## Status

Accepted

## Context

Each agent type in the simulation (villager, zombie, fish, bird, dog, boat) needs to make decisions about what to do. For example, a zombie might:
- Wander aimlessly when no targets nearby
- Become suspicious when hearing a sound
- Pursue a detected villager
- Lunge to attack when close enough

We need a decision-making architecture that:
- Is easy to understand and debug
- Supports clear, predictable behavior
- Can be visualized and documented
- Handles the complexity of 6+ agent types
- Performs well with hundreds of agents

## Options Considered

### Option 1: Finite State Machine (FSM)

Agents have discrete states with explicit transitions:

```
┌──────────┐  detect target  ┌───────────┐
│ Wandering│ ───────────────→│ Pursuing  │
└──────────┘                 └───────────┘
     ↑                            │
     │      lose target           │
     └────────────────────────────┘
```

**Pros:**
- Simple to understand and implement
- Easy to visualize (state diagrams)
- Predictable behavior
- Efficient (just check current state)
- Easy to debug (what state am I in?)
- Well-documented pattern

**Cons:**
- State explosion with complex behaviors
- Transitions can become spaghetti
- Hard to represent concurrent behaviors
- Rigid structure

### Option 2: Behavior Trees

Hierarchical tree of behaviors with selectors and sequences:

```
Root (Selector)
├── Sequence: Attack
│   ├── Condition: Target in range?
│   └── Action: Lunge
├── Sequence: Chase
│   ├── Condition: Target visible?
│   └── Action: Move toward target
└── Action: Wander
```

**Pros:**
- Modular and reusable subtrees
- Good for complex, layered behaviors
- Industry standard for AAA games
- Handles priorities naturally

**Cons:**
- More complex to implement correctly
- Harder to visualize full behavior
- Debugging requires tree traversal understanding
- Overkill for simpler agents
- Performance overhead from tree traversal

### Option 3: Goal-Oriented Action Planning (GOAP)

Agents have goals and actions; planner finds action sequences:

```
Goal: Kill villager
Actions: [Move, Attack, Search]
Planner finds: Search → Move → Attack
```

**Pros:**
- Emergent, intelligent-seeming behavior
- Agents adapt to situations
- Highly flexible

**Cons:**
- Complex to implement and tune
- Expensive planning computation
- Hard to predict/debug behavior
- Overkill for observation-focused simulation
- Difficult to ensure specific behaviors

### Option 4: Utility AI

Score all possible actions, pick highest:

```
Wander: 0.3
Pursue: 0.8  ← Winner
Flee: 0.1
```

**Pros:**
- Smooth transitions between behaviors
- Easy to tune via utility curves
- Good for nuanced decisions

**Cons:**
- Can feel "mushy" (no clear states)
- Harder to debug (why this score?)
- Tuning curves is time-consuming
- Less predictable than FSM

## Decision

We will use **Finite State Machines (FSM)** for agent decision-making.

## Rationale

1. **Appropriate Complexity**: Our agents have 4-6 distinct states each. FSM handles this perfectly without the overhead of behavior trees or GOAP.

2. **Debuggability**: When a zombie behaves unexpectedly, we can ask "what state is it in?" and "what triggered this transition?" This is invaluable for development.

3. **Visualization**: State diagrams are easy to create and understand. Design docs can include complete state diagrams for each agent type.

4. **Performance**: FSM is O(1) for state checks. With hundreds of agents, this matters. No tree traversal or planning computation.

5. **Predictability**: For an observation-focused simulation, we want behaviors that are understandable to viewers. FSM provides clear, predictable patterns.

6. **Documentation**: Each agent's behavior can be fully documented as a state diagram with transition conditions. This supports the Part 1 documentation goal.

7. **Team Familiarity**: FSM is widely understood. New developers can contribute quickly.

### Why Not Behavior Trees?

Behavior trees excel when:
- Agents need complex, layered decision-making
- Subtrees are reused across many agent types
- AAA-level AI sophistication is needed

Our simulation doesn't need this. A zombie's behavior (wander → suspicious → pursue → lunge) maps naturally to FSM states. Behavior trees would add complexity without benefit.

### Why Not GOAP?

GOAP excels when:
- Agents should "figure out" how to achieve goals
- Emergent behavior is desired
- Complex multi-step plans are needed

Our agents have simple, designer-specified behaviors. We want zombies to behave predictably, not creatively. GOAP's planning overhead isn't justified.

## Consequences

### Positive

- Simple, understandable agent behaviors
- Easy to debug ("agent is in Pursuing state")
- Complete state diagrams in documentation
- Efficient execution (O(1) state checks)
- Predictable, observable behaviors
- Low implementation complexity

### Negative

- Complex behaviors require more states (potential state explosion)
- Concurrent behaviors need careful design (hierarchical FSM or parallel machines)
- Transitions can become complex with many conditions

### Risks

- **State explosion**: Mitigated by keeping agent behaviors focused (4-6 states per type)
- **Transition spaghetti**: Mitigated by clear transition rules and documentation
- **Concurrent behaviors**: Mitigated by using separate FSMs for orthogonal concerns (e.g., movement FSM + social FSM for villagers)

### Implementation Guidelines

1. **Entry/Exit Actions**: Each state has optional entry and exit actions for setup/cleanup
2. **Transition Guards**: Transitions have conditions that must be true to fire
3. **Update Method**: Current state's update runs each frame
4. **State Validity**: Current state is always defined and valid (invariant)
5. **Transition Validity**: Only defined transitions are allowed (invariant)

## Cross-References

- #[[file:docs/Code_Tech_Docs/patterns/state-machine.md]]
- #[[file:docs/Design_Docs/agent-behaviors/villager-mechanics.md]]
- #[[file:docs/Design_Docs/agent-behaviors/zombie-mechanics.md]]
- #[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]]
- Correctness Properties: 7, 8
