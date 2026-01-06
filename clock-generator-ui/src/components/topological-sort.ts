/**
 * Topological sort utility for ordering entities by source-sink relationships.
 * Orders entities so that sources appear before sinks, matching material flow.
 */

import type { SerializableEntityStateTransitions } from 'clock-generator/browser';

interface EntityNode {
    entity: SerializableEntityStateTransitions;
    dependencies: Set<string>; // entity_ids this entity depends on (sources)
    dependents: Set<string>;   // entity_ids that depend on this entity (sinks)
}

/**
 * Build a dependency graph from entities based on source/sink relationships
 */
function buildDependencyGraph(
    entities: SerializableEntityStateTransitions[]
): Map<string, EntityNode> {
    const graph = new Map<string, EntityNode>();
    const entityMap = new Map<string, SerializableEntityStateTransitions>();

    // First pass: create nodes for all entities
    for (const entity of entities) {
        entityMap.set(entity.entity_id, entity);
        graph.set(entity.entity_id, {
            entity,
            dependencies: new Set(),
            dependents: new Set(),
        });
    }

    // Second pass: build dependency relationships
    for (const entity of entities) {
        const node = graph.get(entity.entity_id)!;

        // If this entity has a source, it depends on the source
        if (entity.source && entityMap.has(entity.source.entity_id)) {
            node.dependencies.add(entity.source.entity_id);
            const sourceNode = graph.get(entity.source.entity_id);
            if (sourceNode) {
                sourceNode.dependents.add(entity.entity_id);
            }
        }

        // If this entity has a sink, the sink depends on this entity
        if (entity.sink && entityMap.has(entity.sink.entity_id)) {
            node.dependents.add(entity.sink.entity_id);
            const sinkNode = graph.get(entity.sink.entity_id);
            if (sinkNode) {
                sinkNode.dependencies.add(entity.entity_id);
            }
        }
    }

    return graph;
}

/**
 * Perform a topological sort using Kahn's algorithm.
 * Returns entities ordered so that sources appear before sinks.
 */
export function sortByRelationship(
    entities: SerializableEntityStateTransitions[]
): SerializableEntityStateTransitions[] {
    if (entities.length === 0) {
        return [];
    }

    const graph = buildDependencyGraph(entities);
    const result: SerializableEntityStateTransitions[] = [];
    const inDegree = new Map<string, number>();
    
    // Calculate in-degrees
    for (const [id, node] of graph) {
        inDegree.set(id, node.dependencies.size);
    }

    // Find all nodes with no dependencies (sources)
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
        if (degree === 0) {
            queue.push(id);
        }
    }

    // Sort queue by entity type for consistent ordering within same dependency level
    // Order: machine, drill, inserter
    const typeOrder = (id: string): number => {
        const node = graph.get(id);
        if (!node) return 999;
        switch (node.entity.entity_type) {
            case 'machine': return 0;
            case 'drill': return 1;
            case 'inserter': return 2;
            default: return 3;
        }
    };

    // Process nodes in topological order
    while (queue.length > 0) {
        // Sort queue for consistent ordering at each level
        queue.sort((a, b) => {
            const typeA = typeOrder(a);
            const typeB = typeOrder(b);
            if (typeA !== typeB) return typeA - typeB;
            return a.localeCompare(b);
        });

        const id = queue.shift()!;
        const node = graph.get(id)!;
        result.push(node.entity);

        // Reduce in-degree for all dependents
        for (const dependentId of node.dependents) {
            const degree = inDegree.get(dependentId)!;
            inDegree.set(dependentId, degree - 1);
            if (degree - 1 === 0) {
                queue.push(dependentId);
            }
        }
    }

    // If there are remaining entities (cycles), add them at the end
    // This handles cases where the graph has cycles
    for (const node of graph.values()) {
        if (!result.includes(node.entity)) {
            result.push(node.entity);
        }
    }

    return result;
}

/**
 * Sort entities by type (machines first, then drills, then inserters)
 */
export function sortByType(
    entities: SerializableEntityStateTransitions[]
): SerializableEntityStateTransitions[] {
    const typeOrder = (entity: SerializableEntityStateTransitions): number => {
        switch (entity.entity_type) {
            case 'machine': return 0;
            case 'drill': return 1;
            case 'inserter': return 2;
            default: return 3;
        }
    };

    return [...entities].sort((a, b) => {
        const typeA = typeOrder(a);
        const typeB = typeOrder(b);
        if (typeA !== typeB) return typeA - typeB;
        return a.entity_id.localeCompare(b.entity_id);
    });
}
