import { Test, TestingModule } from '@nestjs/testing';
import { EnvConfig } from './env-config.service';
import { GitHubService } from './github.service';
import { HttpException } from '@nestjs/common';
import { DiscordLogger } from './discord-logger.service';
import { BugReport } from './models/bug_report.model';
import dedent = require('dedent');

describe('GitHubService', () => {
  const getContentMock = jest
    .fn()
    .mockResolvedValue({ data: [], headers: { status: '200' } });

  const createIssueMock = jest
    .fn()
    .mockResolvedValue({ data: [], headers: { status: '201' } });

  // TODO: couldn't find out how to provide a partial mock in a type-safe way
  const octokitMock = jest.fn().mockImplementation(() => ({
    repos: { getContent: getContentMock },
    issues: { create: createIssueMock },
  }));

  let service: GitHubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GitHubService, EnvConfig, DiscordLogger],
    })
      .overrideProvider(EnvConfig)
      .useValue({
        gitHubToken: 'abcdef123',
        maxCacheSizeBytes: 5000,
        githubIssueTracker: { owner: 'pirulo', repo: 'bugs' },
      } as Partial<EnvConfig>)
      .overrideProvider(DiscordLogger)
      .useValue({})
      .compile();

    service = module.get<GitHubService>(GitHubService);
    service.octokit = new octokitMock();
    getContentMock.mockClear();
  });

  describe('repositoryContents', () => {
    it('parses the given slug', async () => {
      await service.repositoryContents('gobstones/demo');
      expect(getContentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'gobstones',
          repo: 'demo',
          path: '.',
        }),
      );
    });

    describe('cache', () => {
      it('when item is new', async () => {
        await service.repositoryContents('gobstones/demo');

        expect(getContentMock).not.toHaveBeenCalledWith(
          expect.objectContaining({
            headers: { 'If-None-Match': '1234' },
          }),
        );
      });

      describe('when item is cached', () => {
        beforeEach(async () => {
          getContentMock.mockResolvedValueOnce({
            data: [{ name: 'file.txt' }],
            headers: { etag: 'W/1234', status: '200' },
          });
          await service.repositoryContents('gobstones/demo');
        });

        it('sends conditional request', async () => {
          await service.repositoryContents('gobstones/demo');
          expect(getContentMock).toHaveBeenCalledWith(
            expect.objectContaining({
              headers: { 'If-None-Match': '1234' },
            }),
          );
        });

        it('reports cache usage', () => {
          expect(service.cacheUsage()).toEqual({
            raw: {
              limit: 5000,
              used: 48,
              remaining: 4952,
            },
            human: {
              limit: '5.00 KB',
              used: '48.00 B',
              remaining: '4.95 KB',
            },
          });
        });

        describe("and data hasn't changed", () => {
          it('returns it', async () => {
            getContentMock.mockRejectedValueOnce({
              name: 'HttpError',
              status: 304,
            });

            const data = await service.repositoryContents('gobstones/demo');
            expect(data).toEqual([{ name: 'file.txt' }]);
          });
        });

        describe('and data has changed', () => {
          let data;

          beforeEach(async () => {
            getContentMock.mockResolvedValueOnce({
              data: [{ name: 'file.txt' }, { name: 'anotherfile.txt' }],
              headers: { etag: 'W/5678' },
            });

            data = await service.repositoryContents('gobstones/demo');
          });
          it('returns the new data', async () => {
            expect(data).toEqual([
              { name: 'file.txt' },
              { name: 'anotherfile.txt' },
            ]);
          });
          it('replaces the cache', async () => {
            getContentMock.mockRejectedValueOnce({
              name: 'HttpError',
              status: 304,
            });

            const newData = await service.repositoryContents('gobstones/demo');
            expect(newData).toEqual([
              { name: 'file.txt' },
              { name: 'anotherfile.txt' },
            ]);
          });
        });
      });
    });

    describe('when the repo and path exist', () => {
      it('returns the metadata', async () => {
        getContentMock.mockResolvedValueOnce({
          data: [{ name: 'file.txt' }],
          headers: { status: '200' },
        });
        expect(await service.repositoryContents('gobstones/demo')).toEqual([
          { name: 'file.txt' },
        ]);
      });
    });

    describe("when the repo or path don't exist", () => {
      it('throws a 404 HttpException', async () => {
        getContentMock.mockRejectedValueOnce({
          name: 'HttpError',
          message: 'Not found',
          status: 404,
        });

        await expect(
          service.repositoryContents('gobstones/demo'),
        ).rejects.toEqual(new HttpException('Not found', 404));
      });
    });

    describe('when an unexpected error happens', () => {
      it('forwards the original error', async () => {
        const unknownError = {
          name: 'Unexpected',
          message: 'boom boom',
        };
        getContentMock.mockRejectedValueOnce(unknownError);

        await expect(
          service.repositoryContents('gobstones/demo'),
        ).rejects.toEqual(unknownError);
      });
    });
  });

  describe('createIssue', () => {
    beforeEach(async () => {
      const report = new BugReport({
        title: 'Something went wrong',
        mode: 'blocks',
        description: 'The board editor is not working for me :cry:',
        browser: 'firefox',
        url: 'https://gobstones.github.io/gobstones-jr/?course=gobstonescursos/curso-LPYSD2-virtual&github=gobstonescursos/curso-LPYSD2-virtual&path=Unidades/0.Repaso/2.Lucho%20enciende%20las%20luces,%20extendido',
        course: 'gobstonescursos/curso-LPYSD2-virtual',
        project: 'Lucho enciende las luces, extendido',
        email: 'student@pm.me',
      });
      await service.createIssue(report);
    });

    it('copies title from the report', () => {
      expect(createIssueMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Something went wrong' }),
      );
    });

    it('assigns labels according to the mode', () => {
      expect(createIssueMock).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['junior'] }),
      );
    });

    it('includes description in the body', () => {
      expect(createIssueMock).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining(
            'The board editor is not working for me :cry:',
          ),
        }),
      );
    });

    it('includes reporter email in the body', () => {
      expect(createIssueMock).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining(
            '_Defecto reportado por [student@pm.me](mailto:student@pm.me)._',
          ),
        }),
      );
    });

    it('includes context data in the body', () => {
      expect(createIssueMock).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining(
            dedent`<details>
              <summary>:information_source: Información adicional</summary>
              
              - :globe_with_meridians: **Navegador:** firefox
              - :paperclip: **URL consultada:** https://gobstones.github.io/gobstones-jr/?course=gobstonescursos/curso-LPYSD2-virtual&github=gobstonescursos/curso-LPYSD2-virtual&path=Unidades/0.Repaso/2.Lucho%20enciende%20las%20luces,%20extendido
              - :closed_book: **Curso:** gobstonescursos/curso-LPYSD2-virtual
              - :pencil: **Proyecto:** Lucho enciende las luces, extendido
            </details>`,
          ),
        }),
      );
    });
  });
});
