import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { GitHubService } from '../src/github.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  const fakeGhResponse = [
    {
      name: '.bowerrc',
      path: '.bowerrc',
      sha: 'ab065bed0a5cb30350ecd7750e4ab209ff7bf69f',
      size: 85,
      url: 'https://api.github.com/repos/gobstones/gobstones-web/contents/.bowerrc?ref=master',
      html_url:
        'https://github.com/gobstones/gobstones-web/blob/master/.bowerrc',
      git_url:
        'https://api.github.com/repos/gobstones/gobstones-web/git/blobs/ab065bed0a5cb30350ecd7750e4ab209ff7bf69f',
      download_url:
        'https://raw.githubusercontent.com/gobstones/gobstones-web/master/.bowerrc',
      type: 'file',
      _links: {
        self: 'https://api.github.com/repos/gobstones/gobstones-web/contents/.bowerrc?ref=master',
        git: 'https://api.github.com/repos/gobstones/gobstones-web/git/blobs/ab065bed0a5cb30350ecd7750e4ab209ff7bf69f',
        html: 'https://github.com/gobstones/gobstones-web/blob/master/.bowerrc',
      },
    },
  ];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GitHubService)
      .useValue({
        repositoryContents: async () => fakeGhResponse,
      })
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /repo', async () => {
    await request(app.getHttpServer())
      .get('/repo/gobstones/gobstones-web')
      .expect(200)
      .expect(fakeGhResponse);
  });
});
