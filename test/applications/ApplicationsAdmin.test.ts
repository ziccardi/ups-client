import axios from 'axios';
import {NEW_APP_NAME} from '../mocks/nockMocks';
import {ApplicationsAdmin} from '../../src/applications/ApplicationsAdmin';

import {UPSMock, utils} from '../mocks/UPSMock';

const BASE_URL = 'http://localhost:8888';
const APP_DEVELOPER_FILTER_OK = 'Test Developer 1';
const APP_DEVELOPER_FILTER_BAD = 'developer 1';

const upsMock = new UPSMock();

afterAll(() => {
  upsMock.uninstall();
});

beforeEach(() => {
  upsMock.initMock();
});

describe('Applications Admin', () => {
  const api = axios.create({baseURL: `${BASE_URL}/rest`});
  const appAdmin = new ApplicationsAdmin();

  it(`Should create an app named ${NEW_APP_NAME} and should return it.`, async () => {
    const newApp = await appAdmin.create(api, NEW_APP_NAME);
    expect(newApp.name).toEqual(NEW_APP_NAME);

    const allApps = await appAdmin.find(api);
    expect(allApps).toHaveLength(1);
    expect(allApps[0].name).toEqual(NEW_APP_NAME);
  });

  it('Should return all apps (1st page)', async () => {
    const ids = utils.generateIDs(45).map(id => ({pushApplicationID: id}));
    await utils.generateApps(upsMock,45, ids);

    const apps = await appAdmin.find(api);
    expect(apps).toHaveLength(10);
    expect(apps).toMatchObject(ids.slice(0, 10));
  });

  it('Should return a given app', async () => {
    utils.generateApps(upsMock, 10);
    // get one app
    const app = (await appAdmin.find(api))[6];

    const filteredApp = await appAdmin.find(api, {
      pushApplicationID: app.pushApplicationID,
    });
    expect(filteredApp).toEqual([app]);
  });

  it('Should return empty result', async () => {
    const filteredApp = await appAdmin.find(api, {
      developer: APP_DEVELOPER_FILTER_BAD,
    });
    expect(filteredApp).toEqual([]);
  });

  it(`Should return all apps developed by ${APP_DEVELOPER_FILTER_OK}`, async () => {
    utils.generateApps(upsMock, 8, new Array(20).fill({developer: APP_DEVELOPER_FILTER_OK}));
    utils.generateApps(upsMock, 10, new Array(10).fill({developer: 'Dev 1'}));
    utils.generateApps(upsMock, 5, new Array(10).fill({developer: 'Dev 2'}));

    const filteredApp = await appAdmin.find(api, {
      developer: APP_DEVELOPER_FILTER_OK,
    });
    expect(filteredApp).toHaveLength(8);
    expect(filteredApp).toMatchObject(new Array(8).fill({developer: APP_DEVELOPER_FILTER_OK}));
  });

  it('Should delete an app using the Id ', async () => {
    const ids = utils.generateIDs(10).map(id => ({pushApplicationID: id}));
    await utils.generateApps(upsMock, 10, ids);

    const idToDelete = ids[5];

    expect(await appAdmin.find(api)).toHaveLength(10);
    expect(await appAdmin.find(api, idToDelete)).toHaveLength(1);

    await appAdmin.delete(api, idToDelete);

    expect(await appAdmin.find(api)).toHaveLength(9);
    expect(await appAdmin.find(api, idToDelete)).toHaveLength(0);
  });
});
