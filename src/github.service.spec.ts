import { Test, TestingModule } from '@nestjs/testing';
import { EnvConfig } from './env-config.service';
import { GitHubService } from './github.service';
import { HttpException } from '@nestjs/common';

describe('GitHubService', () => {
  const getContentMock = jest.fn();

  // TODO: couldn't find out how to provide a partial mock in a type-safe way
  const octokitMock = jest.fn().mockImplementation(() => ({
    rest: { repos: { getContent: getContentMock } },
  }));

  let service: GitHubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GitHubService, EnvConfig],
    })
      .overrideProvider(EnvConfig)
      .useValue({ gitHubToken: 'abcdef123' })
      .compile();

    service = module.get<GitHubService>(GitHubService);
    service.octokit = new octokitMock();
  });

  describe('getContent', () => {
    describe('when the repo and path exist', () => {
      it('returns the metadata', async () => {
        getContentMock.mockResolvedValue({ data: [{ name: 'file.txt' }] });
        expect(await service.getContent('gobstones/demo')).toEqual([
          { name: 'file.txt' },
        ]);
      });
    });

    describe("when the repo or path don't exist", () => {
      it('throws a 404 HttpException', async () => {
        getContentMock.mockRejectedValue({
          name: 'HttpError',
          message: 'Not found',
          status: 404,
        });

        await expect(service.getContent('gobstones/demo')).rejects.toEqual(
          new HttpException('Not found', 404),
        );
      });
    });

    describe('when an unexpected error happens', () => {
      it('forwards the original error', async () => {
        const unknownError = {
          name: 'Unexpected',
          message: 'boom boom',
        };
        getContentMock.mockRejectedValue(unknownError);

        await expect(service.getContent('gobstones/demo')).rejects.toEqual(
          unknownError,
        );
      });
    });
  });
});
