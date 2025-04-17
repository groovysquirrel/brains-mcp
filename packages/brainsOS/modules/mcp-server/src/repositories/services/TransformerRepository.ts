import { AbstractRepository } from './BaseRepository';
import { Transformer, TransformationPath } from '../../types/core/Transformer';

export class TransformerRepository extends AbstractRepository<Transformer> {
  private static instance: TransformerRepository;

  private constructor() {
    super('Transformer');
  }

  public static getInstance(): TransformerRepository {
    if (!TransformerRepository.instance) {
      TransformerRepository.instance = new TransformerRepository();
    }
    return TransformerRepository.instance;
  }

  protected getId(transformer: Transformer): string {
    return transformer.config.name;
  }

  public async getById(id: string): Promise<Transformer | undefined> {
    return this.get(id);
  }

  public async registerTransformer(transformer: Transformer): Promise<void> {
    await this.register(transformer);
  }

  public async listTransformers(): Promise<Transformer[]> {
    return this.getAll();
  }

  public async getTransformer(objectType: string, fromView: string, toView: string): Promise<Transformer | undefined> {
    const transformers = await this.getAll();
    return transformers.find(t => 
      t.config.objectType === objectType && 
      t.config.fromView === fromView && 
      t.config.toView === toView
    );
  }

  public async findTransformationPath(
    objectType: string,
    fromView: string,
    toView: string
  ): Promise<TransformationPath[]> {
    const transformers = await this.getAll();
    
    const path: TransformationPath[] = [];
    let currentView = fromView;
    const visitedViews = new Set<string>();
    visitedViews.add(currentView);

    // Check for direct path first
    const directTransformer = transformers.find(t => 
      t.config.objectType === objectType && 
      t.config.fromView === fromView && 
      t.config.toView === toView
    );
    
    if (directTransformer) {
      path.push({
        fromView,
        toView,
        transformer: directTransformer
      });
      console.log(`Found complete path: [${path.map(p => `${p.fromView}->${p.toView}`).join(', ')}]`);
      return path;
    }

    // Find a path through intermediate views
    while (currentView !== toView) {
      // Find all transformers that can take us from current view
      const availableTransformers = transformers.filter(
        t => t.config.objectType === objectType && t.config.fromView === currentView
      );

      // If no transformers available, we can't proceed
      if (availableTransformers.length === 0) {
        return [];
      }

      // Prefer transformers that lead directly to the target view
      const directToTarget = availableTransformers.find(t => t.config.toView === toView);
      if (directToTarget) {
        path.push({
          fromView: currentView,
          toView: toView,
          transformer: directToTarget
        });
        break;
      }

      // Otherwise, find a transformer that leads to an unvisited view
      const nextTransformer = availableTransformers.find(
        t => !visitedViews.has(t.config.toView)
      );

      if (!nextTransformer) {
        // No unvisited views available - we're in a cycle
        return [];
      }

      path.push({
        fromView: currentView,
        toView: nextTransformer.config.toView,
        transformer: nextTransformer
      });
      
      currentView = nextTransformer.config.toView;
      visitedViews.add(currentView);
    }

    if (path.length > 0) {
      console.log(`Found complete path: [${path.map(p => `${p.fromView}->${p.toView}`).join(', ')}]`);
    }

    return path;
  }
} 